import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── State machine: allowed from → [to] transitions ───────────────────────
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open:                ['in_progress'],
  needs_manual_review: ['in_progress'],
  in_progress:         ['resolved', 'rejected'],
  // terminal states — no outbound transitions
  resolved:            [],
  rejected:            [],
};

// ─── In-memory state for local development (mock mode) ────────────────────
const mockWorkerProfiles = [
  { id: 'mock-user-id-1', ward_id: 1 }
];
const mockStatusHistory: any[] = [];

class MockResolveDB {
  private getReports() {
    try {
      const g = global as any;
      return Array.isArray(g.__mockReports) ? g.__mockReports : [];
    } catch {
      return [];
    }
  }

  getReport(id: string) {
    return this.getReports().find((r: any) => r.id === id) || null;
  }

  updateReport(id: string, patch: any) {
    const g = global as any;
    if (!Array.isArray(g.__mockReports)) return false;
    const idx = g.__mockReports.findIndex((r: any) => r.id === id);
    if (idx === -1) return false;
    g.__mockReports[idx] = { ...g.__mockReports[idx], ...patch };
    return true;
  }

  getWorkerProfile(userId: string) {
    return mockWorkerProfiles.find(p => p.id === userId) || null;
  }

  insertHistory(entry: any) {
    mockStatusHistory.push({ id: 'hist-' + Math.random().toString(36).slice(2), ...entry });
  }
}

// Helper to determine action type
const getActionType = (newStatus: string): 'investigate' | 'resolve' | 'reject' => {
  if (newStatus === 'in_progress') return 'investigate';
  if (newStatus === 'resolved') return 'resolve';
  return 'reject';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── 1. Method guard ──────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── 2. Parse + validate request body ────────────────────────────────────
  const { 
    reportId, 
    newStatus, 
    currentStatus: clientCurrentStatus, 
    wardId: clientWardId,
    afterImage,       // base64 data URI
    rejectionReason,  // string
    workerNotes       // string
  } = req.body as {
    reportId?: string;
    newStatus?: string;
    currentStatus?: string;
    wardId?: number;
    afterImage?: string;
    rejectionReason?: string;
    workerNotes?: string;
  };

  if (!reportId || typeof reportId !== 'string') {
    return res.status(400).json({ error: 'Bad Request: reportId is required' });
  }
  if (!newStatus || typeof newStatus !== 'string') {
    return res.status(400).json({ error: 'Bad Request: newStatus is required' });
  }
  if (!Object.keys(ALLOWED_TRANSITIONS).includes(newStatus)) {
    return res.status(400).json({ error: `Bad Request: "${newStatus}" is not a valid status value` });
  }

  // ── 3. Feature-specific validation rules ────────────────────────────────
  if (newStatus === 'resolved' && !afterImage) {
    return res.status(400).json({ error: 'Bad Request: Resolution requires uploading an "after" photo.' });
  }
  if (newStatus === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
    return res.status(400).json({ error: 'Bad Request: Rejection requires providing a rejection reason.' });
  }

  // ── 4. Determine mock vs real mode ───────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const isMock = !supabaseUrl || !anonKey;

  const actionType = getActionType(newStatus);

  if (isMock) {
    // ── MOCK MODE: skip JWT auth, use in-memory data ─────────────────────
    console.log('[resolve] Running in mock mode (no Supabase credentials)');
    const db = new MockResolveDB();

    const mockUserId = 'mock-user-id-1';
    const profile = db.getWorkerProfile(mockUserId);
    if (!profile) {
      return res.status(403).json({ error: 'Forbidden: no worker profile found (mock)' });
    }

    const report = db.getReport(reportId);
    if (!report && !clientCurrentStatus) {
      return res.status(404).json({ error: `Not Found: report "${reportId}" not found in mock store` });
    }

    const reportWardId = report?.ward_id ?? clientWardId ?? 1;
    const currentStatus = report?.status ?? clientCurrentStatus!;

    // Ward scope check
    if (reportWardId !== profile.ward_id) {
      return res.status(403).json({
        error: `Forbidden: report belongs to ward ${reportWardId}, you are assigned to ward ${profile.ward_id}`
      });
    }

    // State machine check
    const allowedNextStates = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowedNextStates.includes(newStatus)) {
      const allowed = allowedNextStates.length > 0 ? allowedNextStates.join(', ') : 'none (terminal state)';
      return res.status(409).json({
        error: `Conflict: cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowed}.`
      });
    }

    // Process mock after image
    let afterImageUrl: string | null = null;
    if (newStatus === 'resolved') {
      afterImageUrl = `https://picsum.photos/seed/resolve-${reportId}/800/600`;
    }

    // Apply update to in-memory report
    const patch = { 
      status: newStatus,
      after_image_url: afterImageUrl,
      rejection_reason: rejectionReason || null,
      worker_notes: workerNotes || null
    };
    db.updateReport(reportId, patch);

    // Audit log
    db.insertHistory({
      report_id: reportId,
      from_status: currentStatus,
      to_status: newStatus,
      changed_by: mockUserId,
      changed_at: new Date().toISOString(),
      action_type: actionType,
      after_image_url: afterImageUrl,
      rejection_reason: rejectionReason || null,
      worker_notes: workerNotes || null
    });
    console.log(`[resolve mock] ${reportId}: ${currentStatus} → ${newStatus} (${actionType})`);

    return res.status(200).json({ 
      success: true, 
      reportId, 
      from: currentStatus, 
      to: newStatus, 
      mock: true,
      after_image_url: afterImageUrl
    });
  }

  // ── REAL MODE: validate JWT + use Supabase ───────────────────────────────
  const authHeader = req.headers['authorization'] as string | undefined;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing Bearer token' });
  }
  const accessToken = authHeader.slice(7);

  // Validate caller identity using their JWT
  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !user) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }

  // Admin client for data operations (use service role if available)
  const adminKey = serviceRoleKey || anonKey;
  const supabase = createClient(supabaseUrl, adminKey);

  // Load worker profile
  const { data: profile, error: profileErr } = await supabase
    .from('worker_profiles')
    .select('ward_id')
    .eq('id', user.id)
    .single();
  if (profileErr || !profile) {
    return res.status(403).json({ error: 'Forbidden: no worker profile found for this user' });
  }

  // Load the report
  const { data: report, error: reportErr } = await supabase
    .from('reports')
    .select('id, status, ward_id')
    .eq('id', reportId)
    .single();
  if (reportErr || !report) {
    return res.status(404).json({ error: 'Not Found: report does not exist' });
  }

  // Ward scope check
  if (report.ward_id !== profile.ward_id) {
    return res.status(403).json({
      error: `Forbidden: report belongs to ward ${report.ward_id}, you are assigned to ward ${profile.ward_id}`
    });
  }

  // State machine validation
  const currentStatus: string = report.status;
  const allowedNextStates = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowedNextStates.includes(newStatus)) {
    const allowed = allowedNextStates.length > 0 ? allowedNextStates.join(', ') : 'none (terminal state)';
    return res.status(409).json({
      error: `Conflict: cannot transition from "${currentStatus}" to "${newStatus}". Allowed next states: ${allowed}.`
    });
  }

  // Upload after image if present
  let afterImageUrl: string | null = null;
  if (newStatus === 'resolved' && afterImage) {
    try {
      const mimeMatch = afterImage.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      const base64Data = afterImage.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `resolved-photos/${reportId}-after-${Date.now()}.png`;

      // Upload to bucket
      const { error: uploadErr } = await supabase.storage
        .from('report-photos')
        .upload(filename, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadErr) {
        throw uploadErr;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('report-photos')
        .getPublicUrl(filename);

      afterImageUrl = urlData.publicUrl;
    } catch (err: any) {
      console.error('[resolve] Image upload failed:', err);
      return res.status(500).json({ error: 'Failed to upload resolution photo', details: err.message });
    }
  }

  // Perform status update on report
  const { error: updateErr } = await supabase
    .from('reports')
    .update({ 
      status: newStatus,
      after_image_url: afterImageUrl,
      rejection_reason: rejectionReason || null,
      worker_notes: workerNotes || null
    })
    .eq('id', reportId);

  if (updateErr) {
    console.error('[resolve] update error:', updateErr);
    return res.status(500).json({ error: 'Internal error: failed to update report status', details: updateErr.message });
  }

  // Write audit log
  const { error: auditErr } = await supabase
    .from('report_status_history')
    .insert({
      report_id:        reportId,
      from_status:      currentStatus,
      to_status:        newStatus,
      changed_by:       user.id,
      action_type:      actionType,
      after_image_url:  afterImageUrl,
      rejection_reason: rejectionReason || null,
      worker_notes:     workerNotes || null
    });

  if (auditErr) {
    console.warn('[resolve] audit log insert failed (non-fatal):', auditErr.message);
  }

  return res.status(200).json({
    success: true,
    reportId,
    from: currentStatus,
    to:   newStatus,
    after_image_url: afterImageUrl
  });
}
