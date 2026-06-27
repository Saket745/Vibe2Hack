import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';


// In-memory fallback database for local development without credentials
// Stored on `global` so both triage.ts and resolve.ts share the same dataset
// when running inside the single dev-server.ts Node process.
const g = global as any;
if (!Array.isArray(g.__mockReports)) g.__mockReports = [];
const getInMemoryReports = (): any[] => g.__mockReports;
const setInMemoryReports = (reports: any[]) => { g.__mockReports = reports; };
const defaultWards = [
  { id: 1, name: 'Ward 1 - Downtown', boundary_coords: { center: { lat: 12.9716, lng: 77.5946 } } },
  { id: 2, name: 'Ward 2 - Koramangala', boundary_coords: { center: { lat: 12.9352, lng: 77.6245 } } },
  { id: 3, name: 'Ward 3 - Indiranagar', boundary_coords: { center: { lat: 12.9719, lng: 77.6412 } } },
  { id: 4, name: 'Ward 4 - Jayanagar', boundary_coords: { center: { lat: 12.9308, lng: 77.5838 } } },
  { id: 5, name: 'Ward 5 - Whitefield', boundary_coords: { center: { lat: 12.9698, lng: 77.7500 } } }
];

class MockSupabaseServer {
  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, _body: any, _options?: any) => {
        console.log(`[Mock Server Storage] Uploading to ${bucket}/${path}`);
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => {
        return { data: { publicUrl: `https://picsum.photos/seed/${path}/800/600` } };
      }
    })
  };

  from(table: string) {
    if (table === 'wards') {
      return {
        select: (_fields: string) => Promise.resolve({ data: defaultWards, error: null })
      };
    }

    return {
      select: (_fields: string) => {
        const builder = {
          data: getInMemoryReports(),
          eq(col: string, val: any) {
            this.data = this.data.filter(item => item[col] === val);
            return this;
          },
          gt(col: string, val: any) {
            this.data = this.data.filter(item => new Date(item[col]).getTime() > new Date(val).getTime());
            return this;
          },
          limit(n: number) {
            this.data = this.data.slice(0, n);
            return this;
          },
          then(onfulfilled: any) {
            return Promise.resolve({ data: this.data, error: null }).then(onfulfilled);
          }
        };
        return builder;
      },
      insert: async (payload: any) => {
        const payloadArray = Array.isArray(payload) ? payload : [payload];
        
        // Enforce unique dedupe_hash constraint in mock
        for (const p of payloadArray) {
          if (p.dedupe_hash) {
            const exists = getInMemoryReports().some(item => item.dedupe_hash === p.dedupe_hash);
            if (exists) {
              console.log(`[Mock Server DB] Unique constraint violation on dedupe_hash: ${p.dedupe_hash}`);
              return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
            }
          }
        }

        const newRecords = payloadArray.map(p => ({
          id: 'mock-uuid-' + Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString(),
          ...p
        }));

        getInMemoryReports().push(...newRecords);
        setInMemoryReports(getInMemoryReports()); // ensure global ref is up-to-date
        console.log(`[Mock Server DB] Inserted record into ${table}:`, newRecords);
        
        return { data: newRecords, error: null };
      }
    };
  }
}

const supabasePublic = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new MockSupabaseServer() as any);

const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : (new MockSupabaseServer() as any);

// Rate limiter storage
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(key: string, limit = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const activeTimestamps = timestamps.filter(ts => now - ts < windowMs);
  
  if (activeTimestamps.length >= limit) {
    return true;
  }
  
  activeTimestamps.push(now);
  rateLimitMap.set(key, activeTimestamps);
  return false;
}

// Distance Calculation Helpers
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const findNearestWard = async (lat: number, lng: number): Promise<{ id: number; name: string }> => {
  try {
    const { data: dbWards, error } = await supabasePublic.from('wards').select('*');
    const wardsList = (dbWards && dbWards.length > 0 && !error) ? dbWards : defaultWards;

    let nearestWard = wardsList[0];
    let minDistance = Infinity;

    for (const w of wardsList) {
      const wCoords = w.boundary_coords ?? {};
      const wLat = wCoords.center?.lat ?? wCoords.lat ?? 12.9716;
      const wLng = wCoords.center?.lng ?? wCoords.lng ?? 77.5946;
      const d = getDistance(lat, lng, wLat, wLng);
      if (d < minDistance) {
        minDistance = d;
        nearestWard = w;
      }
    }

    return { id: nearestWard.id, name: nearestWard.name };
  } catch (err) {
    console.warn('Error matching ward:', err);
    return { id: 1, name: 'Ward 1 - Downtown' };
  }
};

// Initialize Gemini client lazily to avoid overhead on cold starts
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  // 1. Handle CORS Preflight request
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Enforce POST request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image, mimeType, reporterId, description, latitude, longitude, client_submission_id } = req.body;

    const ip = (req.headers['x-real-ip'] as string) || 
               (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
               req.socket?.remoteAddress || 
               'unknown-ip';
    
    // Generate UUID if reporterId is missing or empty
    const finalReporterId = reporterId || crypto.randomUUID();

    console.log(`[Triage Request] Received upload from reporter: ${finalReporterId}. IP: ${ip}. MimeType: ${mimeType}`);

    // Rate limiting by IP and reporter ID
    if (isRateLimited(`ip:${ip}`) || isRateLimited(`reporter:${finalReporterId}`)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute before submitting another report.' });
    }

    if (!image) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    // Size limit check (2MB base64 string length limit ~ 1.5MB binary)
    if (image.length > 2 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload too large. Image must be under 1.5MB compressed.' });
    }

    if (!mimeType) {
      return res.status(400).json({ error: 'Missing mimeType' });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'GPS location coordinates are required.' });
    }

    // 3. Clean base64 image string (strip the "data:image/...;base64," prefix if it exists)
    let cleanBase64 = image;
    if (image.includes(';base64,')) {
      cleanBase64 = image.split(';base64,')[1];
    }

    // 4. Initialize Gemini and make prediction
    const ai = getAiClient();
    
    // Construct rich, detailed prompt with clear severity and classification rules
    const prompt = `Analyze this image to detect public/municipal infrastructure or public space issues.
Evaluate the issue according to the following strict guidelines:

1. Category Classification:
   - 'pothole': Road damage, surface cracks, depressions, or scaling on public streets.
   - 'garbage': Waste pileups, overflowing public bins, dumped trash on pavements, or litter.
   - 'streetlight': Out-of-service street lamps, flickering lights, dark poles at night, or exposed wiring.
   - 'water leakage': Fractured mains, leaking public pipes, bursting fire hydrants, or running street floods.
   - 'drainage': Blocked grates, overflowing sewers, back-flooding, or stagnant pools of stagnant runoff.

2. Severity Evaluation:
   - Pothole:
     - 'high': Deep, wide potholes posing immediate danger to car axles, tire blowouts, or pedestrian safety (tripping/falling).
     - 'medium': Moderately deep potholes requiring repairs soon, causing drivers to swerve.
     - 'low': Surface scaling, minor cracks, or shallow potholes.
   - Garbage:
     - 'high': Massive commercial dumps, hazardous/toxic waste blocking paths, highly unsanitary piles near residential spots.
     - 'medium': Overflowing community bins, mid-size sidewalk piles.
     - 'low': Scattered wrappers, minor litter, or a single full trash can.
   - Streetlight:
     - 'high': Exposed wiring, multiple dark light poles in a sequence causing pitch-black roads.
     - 'medium': A single broken bulb on a busy street or intersection.
     - 'low': Flickering bulb, or single pole dark on a minor residential lane.
   - Water Leakage:
     - 'high': Major pipe burst causing active road flooding, sinkhole threats, or water loss in whole neighborhood.
     - 'medium': Steady stream running from a pipe joint.
     - 'low': Minor, slow drip or damp soil around a pipe.
   - Drainage:
     - 'high': Overflowing raw sewage, backup into residences/businesses, or fully clogged drains causing street flooding.
     - 'medium': Stagnant pool of dirty runoff slowly draining, partial blockage.
     - 'low': Minor debris/leaves on top of a grate not blocking the flow.

3. Civic Validation:
   - Set 'isValidCivicIssue' to true if the image clearly contains one of these 5 issues.
   - Set 'isValidCivicIssue' to false if the image is unrelated (e.g., text, document, pet, indoor room, landscape, selfie, cartoon).
   - Set 'isBorderline' to true if the image is ambiguous, blurry, or difficult to definitively evaluate, but might contain an issue.

4. Confidence and Reason:
   - Assess your classification 'confidence' as a decimal between 0.0 and 1.0.
   - If invalid ('isValidCivicIssue' = false) or borderline ('isBorderline' = true), describe why in 'rejectionReason'. Otherwise, set 'rejectionReason' to an empty string.

5. Segmentation Mask:
   - Return a normalized bounding box [ymin, xmin, ymax, xmax] between 0 and 1000 enclosing the issue. Set to [0, 0, 0, 0] if 'isValidCivicIssue' is false.`;

    let responseText = "";
    const isMock = !process.env.GEMINI_API_KEY; // Run real Gemini API if key is set in env
    if (isMock) {
      console.log("[Setup] Running in MOCK Gemini mode to bypass API quota limits.");
      const isPothole = (description || '').toLowerCase().includes('pothole');
      if (isPothole) {
        responseText = JSON.stringify({
          category: 'pothole',
          severity: 'high',
          explanation: 'Detected a large pothole on the public street surface.',
          isValidCivicIssue: true,
          isBorderline: false,
          confidence: 0.95,
          rejectionReason: '',
          segmentation_mask: {
            box_2d: [100, 200, 500, 600],
            label: 'pothole'
          }
        });
      } else {
        responseText = JSON.stringify({
          category: 'pothole',
          severity: 'medium',
          explanation: 'Image does not contain a valid public infrastructure issue.',
          isValidCivicIssue: false,
          isBorderline: false,
          confidence: 0.95,
          rejectionReason: 'The photo is invalid or does not contain a public space civic issue.',
          segmentation_mask: {
            box_2d: [0, 0, 0, 0],
            label: 'invalid'
          }
        });
      }
    } else {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanBase64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              category: {
                type: 'STRING',
                enum: ['pothole', 'garbage', 'streetlight', 'water leakage', 'drainage']
              },
              severity: {
                type: 'STRING',
                enum: ['low', 'medium', 'high']
              },
              explanation: {
                type: 'STRING'
              },
              isValidCivicIssue: {
                type: 'BOOLEAN',
                description: 'Whether the image contains a valid public infrastructure or civic issue'
              },
              isBorderline: {
                type: 'BOOLEAN',
                description: 'Whether the image is borderline, ambiguous, or needs manual review'
              },
              confidence: {
                type: 'NUMBER',
                description: 'Confidence score as a float between 0.0 and 1.0'
              },
              rejectionReason: {
                type: 'STRING',
                description: 'Reason explaining rejection or manual review request. Return empty string if not applicable.'
              },
              segmentation_mask: {
                type: 'OBJECT',
                properties: {
                  box_2d: {
                    type: 'ARRAY',
                    items: { type: 'INTEGER' },
                    description: 'Normalized bounding box [ymin, xmin, ymax, xmax] in range 0-1000. Use [0,0,0,0] if not applicable.'
                  },
                  label: { type: 'STRING' }
                },
                required: ['box_2d', 'label']
              }
            },
            required: [
              'category', 
              'severity', 
              'explanation', 
              'isValidCivicIssue', 
              'isBorderline', 
              'confidence', 
              'rejectionReason', 
              'segmentation_mask'
            ]
          }
        }
      });
      responseText = response.text || "";
    }

    if (!responseText) {
      throw new Error('Gemini returned an empty response');
    }

    const duration = Date.now() - startTime;
    console.log(`[Gemini Response] Duration: ${duration}ms. Raw Output:\n`, responseText);

    const parsedResult = JSON.parse(responseText);

    // Normalize and validate severity
    let severity = (parsedResult.severity || 'medium').toLowerCase();
    if (!['low', 'medium', 'high'].includes(severity)) {
      severity = 'medium';
    }
    parsedResult.severity = severity;

    // 6. Map validation status dynamically
    let status = 'open';
    if (!parsedResult.isValidCivicIssue) {
      if (parsedResult.isBorderline) {
        status = 'needs_manual_review';
        parsedResult.rejectionReason = parsedResult.rejectionReason || 'Borderline / needs human verification';
      } else {
        status = 'rejected';
        parsedResult.rejectionReason = parsedResult.rejectionReason || 'Not a civic infrastructure issue';
      }
    } else if (parsedResult.confidence < 0.70) {
      status = 'needs_manual_review';
      parsedResult.rejectionReason = parsedResult.rejectionReason || `Low confidence score (${(parsedResult.confidence * 100).toFixed(0)}%)`;
    }

    // Halt and return immediately if the issue is flatly rejected
    if (status === 'rejected') {
      const finalPayload = {
        ...parsedResult,
        status,
        severity,
        reporterId: finalReporterId,
        metadata: {
          duration_ms: duration,
          timestamp: new Date().toISOString(),
          model: 'gemini-2.5-flash'
        }
      };
      console.log(`[Triage Rejected] Halted: ${parsedResult.rejectionReason}`);
      return res.status(200).json(finalPayload);
    }

    // 7. Match nearest ward
    const matchedWard = await findNearestWard(Number(latitude), Number(longitude));

    // 8. Calculate Deduplication Hash using normalized server-side parameters or client UUID
    const now = new Date();
    const minutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    // UTC 5-minute time bucket to avoid timezone issues
    const timeBucket = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), roundedMinutes, 0, 0)).toISOString();
    const roundedLat = Number(latitude).toFixed(4);
    const roundedLng = Number(longitude).toFixed(4);
    
    const calculatedHash = `${finalReporterId}:${matchedWard.id}:${parsedResult.category}:${roundedLat}:${roundedLng}:${timeBucket}`;
    const dedupeHash = client_submission_id ? `client_id_${client_submission_id}` : calculatedHash;

    // Fast check to see if duplicate exists
    const { data: existingDup, error: queryError } = await supabasePublic
      .from('reports')
      .select('id')
      .eq('dedupe_hash', dedupeHash)
      .limit(1);

    if (queryError) {
      console.warn('Backend duplicate select query warning:', queryError);
    } else if (existingDup && existingDup.length > 0) {
      console.log(`[Duplicate Blocked] Request matched existing dedupe hash: ${dedupeHash}`);
      return res.status(409).json({
        error: 'Duplicate report detected.',
        duplicate: true,
        message: 'This report appears to be already submitted nearby.'
      });
    }

    // 9. Upload image to Storage using the Admin client
    const imageBuffer = Buffer.from(cleanBase64, 'base64');
    const fileExt = mimeType.split('/')[1] || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${finalReporterId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('report-photos')
      .upload(filePath, imageBuffer, { contentType: mimeType, upsert: true });

    let imageUrl = '';
    if (uploadError) {
      console.warn('Storage upload error on server (using fallback data URI):', uploadError);
      imageUrl = image; // fallback to base64 preview
    } else {
      const { data: urlData } = supabaseAdmin.storage
        .from('report-photos')
        .getPublicUrl(filePath);
      imageUrl = urlData?.publicUrl || image;
    }

    // 10. Insert database record using the Public client (under RLS check constraints)
    const { data: insertData, error: insertError } = await supabasePublic
      .from('reports')
      .insert({
        reporter_id: finalReporterId,
        image_url: imageUrl,
        description: description || '',
        latitude: Number(latitude),
        longitude: Number(longitude),
        category: parsedResult.category,
        severity: severity,
        status: status,
        ward_id: matchedWard.id,
        ai_analysis: {
          ...parsedResult,
          status,
          severity,
          category: parsedResult.category
        },
        dedupe_hash: dedupeHash
      });

    if (insertError) {
      // Postgres UNIQUE constraint conflict error code
      if (insertError.code === '23505') {
        console.log(`[Duplicate Blocked] Unique key conflict on dedupe_hash: ${dedupeHash}`);
        return res.status(409).json({
          error: 'Duplicate report detected.',
          duplicate: true,
          message: 'This report appears to be already submitted nearby.'
        });
      }
      throw new Error(`Database save failed: ${insertError.message}`);
    }

    const finalPayload = {
      ...parsedResult,
      status,
      severity,
      imageUrl,
      reporterId: finalReporterId,
      wardName: matchedWard.name,
      dbRecord: insertData ? insertData[0] : null,
      metadata: {
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        model: 'gemini-2.5-flash'
      }
    };

    console.log(`[Triage Success] Final status: ${status}. Category: ${parsedResult.category}. Severity: ${parsedResult.severity}`);
    return res.status(200).json(finalPayload);
  } catch (error: any) {
    console.error('Triage Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error during triage',
      details: error.message || error
    });
  }
}
