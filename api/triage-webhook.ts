import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Fallback logic for when AI fails (simulated Graceful Degradation)
const FALLBACK_CATEGORY = 'unknown'; // Note: With Phase 3 dynamic schema, 'unknown' maps to the placeholder categories.
const FALLBACK_SEVERITY = 'unknown';

// Pre-fetched wards cache
let cachedWards: any[] | null = null;
async function fetchWards() {
  if (cachedWards) return cachedWards;
  const { data } = await supabaseAdmin.from('wards').select('*');
  cachedWards = data || [];
  return cachedWards;
}

// Haversine distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function findNearestWard(lat: number, lng: number) {
  const wards = await fetchWards();
  if (wards.length === 0) return { id: null, name: 'Unknown Ward' };

  let nearest = wards[0];
  let minDistance = Infinity;

  for (const ward of wards) {
    if (ward.boundary_coords && ward.boundary_coords.center) {
      const { lat: cLat, lng: cLng } = ward.boundary_coords.center;
      const dist = getDistance(lat, lng, cLat, cLng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = ward;
      }
    }
  }
  return nearest;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    
    // Supabase Webhook signature validation should be here in prod
    // if (req.headers['x-supabase-signature'] !== expected) ...
    
    if (payload.type !== 'INSERT' || payload.table !== 'reports') {
      return res.status(200).json({ message: 'Ignored non-insert webhook' });
    }

    const record = payload.record;
    
    // Only process reports that are explicitly marked pending triage
    if (record.status !== 'pending_triage') {
      return res.status(200).json({ message: 'Ignored report not in pending state' });
    }

    const { id: reportId, image_url: tempStoragePath, reporter_id: reporterId, description, latitude, longitude } = record;

    if (!tempStoragePath) {
      console.warn(`[Webhook Error] Report ${reportId} missing image_url (tempStoragePath)`);
      return res.status(400).json({ error: 'Missing tempStoragePath' });
    }

    // 1. Fetch valid categories from the new issue_categories table
    const { data: categoriesData, error: catError } = await supabaseAdmin.from('issue_categories').select('name, description');
    if (catError) throw new Error('Failed to fetch dynamic categories');
    
    const categoryDescriptions = categoriesData
      .filter(c => c.name !== 'unknown')
      .map(c => `   - '${c.name}': ${c.description}`).join('\n');

    // 2. Download image from temp storage path
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from('report-photos')
      .download(tempStoragePath);

    if (downloadError || !fileBlob) {
      console.error('Failed to download temp image:', downloadError);
      return res.status(500).json({ error: 'Failed to retrieve uploaded image from storage.' });
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const cleanBase64 = Buffer.from(arrayBuffer).toString('base64');
    // We assume jpg for temp since mimeType isn't saved in the db currently (or we derive it from extension)
    const mimeType = tempStoragePath.toLowerCase().endsWith('png') ? 'image/png' : 'image/jpeg';

    // 3. Initialize Gemini
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `Analyze this image to detect public/municipal infrastructure or public space issues.
Evaluate the issue according to the following strict guidelines:

1. Category Classification:
${categoryDescriptions}

2. Severity Evaluation:
   - 'high': Immediate danger to public safety, severe disruption.
   - 'medium': Noticeable disruption, requires timely attention.
   - 'low': Minor inconvenience, aesthetic issue.

Respond STRICTLY with valid JSON. Do NOT wrap in markdown.
{
  "category": "<Must be exactly one of the defined category names>",
  "severity": "low|medium|high",
  "explanation": "1 sentence explanation of why.",
  "isValidCivicIssue": boolean,
  "isBorderline": boolean,
  "confidence": <float between 0 and 1>,
  "rejectionReason": "If isValidCivicIssue is false, explain why. Else empty string."
}`;

    const startTime = Date.now();
    let parsedResult;
    let status = 'open';

    try {
      const result = await model.generateContent([
        { inlineData: { data: cleanBase64, mimeType } },
        { text: prompt }
      ]);
      const responseText = result.response.text();
      parsedResult = JSON.parse(responseText.trim());
      
      if (!parsedResult.isValidCivicIssue && !parsedResult.isBorderline) {
        status = 'rejected';
      }
    } catch (aiError) {
      console.error('[Gemini AI Error]', aiError);
      parsedResult = {
        category: FALLBACK_CATEGORY,
        severity: FALLBACK_SEVERITY,
        explanation: 'AI Service Temporarily Unavailable - Falling back to manual triage',
        isValidCivicIssue: true,
        isBorderline: true,
        confidence: 0,
        rejectionReason: ''
      };
      status = 'open'; // Keep it open for manual review by a human
    }

    const duration = Date.now() - startTime;
    let finalCategory = parsedResult.category?.toLowerCase() || FALLBACK_CATEGORY;
    let severity = parsedResult.severity?.toLowerCase() || FALLBACK_SEVERITY;

    // Validate category against dynamic categories
    const validCategoryNames = categoriesData.map(c => c.name);
    if (!validCategoryNames.includes(finalCategory)) {
        finalCategory = FALLBACK_CATEGORY;
    }

    // 4. Handle Rejected Items (Garbage Collection)
    if (status === 'rejected') {
      await supabaseAdmin.storage.from('report-photos').remove([tempStoragePath]);
      
      await supabaseAdmin.from('reports').update({
        status: 'rejected',
        ai_analysis: { ...parsedResult, status: 'rejected' }
      }).eq('id', reportId);

      console.log(`[Webhook Triage] Report ${reportId} rejected by AI.`);
      return res.status(200).json({ message: 'Rejected' });
    }

    // 5. Handle Accepted/Borderline Items
    const fileExt = tempStoragePath.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const permanentPath = `${reporterId}/${fileName}`;

    const { error: moveError } = await supabaseAdmin.storage
      .from('report-photos')
      .move(tempStoragePath, permanentPath);

    let imageUrl = '';
    if (moveError) {
      console.warn('Storage move error on server:', moveError);
      const { data: urlData } = supabaseAdmin.storage.from('report-photos').getPublicUrl(tempStoragePath);
      imageUrl = urlData?.publicUrl || '';
    } else {
      const { data: urlData } = supabaseAdmin.storage.from('report-photos').getPublicUrl(permanentPath);
      imageUrl = urlData?.publicUrl || '';
    }

    // 6. Match Ward & Dedupe Hash
    const matchedWard = await findNearestWard(Number(latitude), Number(longitude));
    const now = new Date();
    const roundedMinutes = Math.floor(now.getUTCMinutes() / 5) * 5;
    const timeBucket = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), roundedMinutes, 0, 0)).toISOString();
    
    // Check if the original dedupe hash was a client_submission_id
    let dedupeHash = record.dedupe_hash;
    if (!dedupeHash || dedupeHash.startsWith('client_id_')) {
      const roundedLat = Number(latitude).toFixed(4);
      const roundedLng = Number(longitude).toFixed(4);
      dedupeHash = `${reporterId}:${matchedWard.id}:${finalCategory}:${roundedLat}:${roundedLng}:${timeBucket}`;
    }

    // 7. Update Database Row
    const { error: updateError } = await supabaseAdmin.from('reports').update({
      status: 'open',
      category: finalCategory,
      severity: severity,
      image_url: imageUrl,
      ward_id: matchedWard.id,
      dedupe_hash: dedupeHash,
      ai_analysis: {
        ...parsedResult,
        status: 'open',
        category: finalCategory,
        severity: severity,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      }
    }).eq('id', reportId);

    if (updateError) {
      // Postgres UNIQUE constraint conflict error code
      if (updateError.code === '23505') {
        console.log(`[Duplicate Blocked] Webhook update hit unique constraint: ${dedupeHash}`);
        await supabaseAdmin.from('reports').update({
            status: 'rejected',
            ai_analysis: { error: 'Duplicate report detected after triage.' }
        }).eq('id', reportId);
        return res.status(200).json({ message: 'Duplicate detected during update' });
      }
      console.error('Failed to update report:', updateError);
      return res.status(500).json({ error: 'Failed to update report row' });
    }

    console.log(`[Webhook Triage] Report ${reportId} processed successfully. Category: ${finalCategory}.`);
    return res.status(200).json({ message: 'Processed successfully' });
  } catch (error: any) {
    console.error('Webhook Triage Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
