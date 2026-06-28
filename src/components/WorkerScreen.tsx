import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { showToast } from '../lib/toast';
import { 
  Lock, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  TrendingUp, 
  LogOut, 
  RefreshCw, 
  Sparkles,
  Inbox,
  UserCheck,
  List,
  ChevronRight,
  X,
  Map,
  AlertCircle,
  Camera,
  FileText,
  Info,
  CloudOff,
  Heart
} from 'lucide-react';
import SearchFilterEngine, { type FilterState } from './SearchFilterEngine';
import WorkerRouteMap from './WorkerRouteMap';

interface Report {
  id: string;
  created_at: string;
  reporter_id: string;
  image_url: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  severity: string;
  status: string;
  ward_id?: number;
  ward_ids?: number[];
  in_progress_at?: string;
  resolved_at?: string;
  after_image_url?: string | null;
  rejection_reason?: string | null;
  worker_notes?: string | null;
  worker_thanked_at?: string | null;
  worker_thanked_by?: string | null;
  wards?: {
    name: string;
  };
  ai_analysis: {
    category: string;
    severity: string;
    explanation: string;
    isValidCivicIssue?: boolean;
    isBorderline?: boolean;
    confidence?: number;
    rejectionReason?: string;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  pothole: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  garbage: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
  streetlight: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  'water leakage': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  drainage: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  high: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
};

const STATUS_BADGES: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  needs_manual_review: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 animate-pulse',
  in_progress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
};

export default function WorkerScreen() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  
  // Worker profile & ward information
  const [wardId, setWardId] = useState<number | null>(null);
  const [wardName, setWardName] = useState<string>('');
  const [reports, setReports] = useState<Report[]>([]);
  const [filters, setFilters] = useState<FilterState | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'route'>('list');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Transition inputs (Phase 2.3.5)
  const [showSubForm, setShowSubForm] = useState<'resolve' | 'reject' | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [workerNotesInput, setWorkerNotesInput] = useState('');
  const [afterImageBase64, setAfterImageBase64] = useState<string | null>(null);

  // Check current session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session) {
        fetchWorkerProfile(session.user);
      }
    });
  }, []);

  // Fetch worker profile details
  const fetchWorkerProfile = async (user: any) => {
    setIsDataLoading(true);
    try {
      // Load available wards list
      const { data: wards, error: wardsErr } = await supabase
        .from('wards')
        .select('*');
      if (wardsErr) throw wardsErr;

      // Load profile
      let { data: profile, error: profileErr } = await supabase
        .from('worker_profiles')
        .select('ward_id')
        .eq('id', user.id)
        .single();
      
      // If profile doesn't exist (e.g. freshly registered), create default profile
      if (profileErr && profileErr.code === 'PGRST116') {
        const { data: newProfile, error: createErr } = await supabase
          .from('worker_profiles')
          .insert({ id: user.id, ward_id: 1 })
          .select('ward_id')
          .single();
        if (createErr) throw createErr;
        profile = newProfile;
        showToast('Created default worker profile for Ward 1', 'info');
      } else if (profileErr) {
        throw profileErr;
      }

      const assignedWardId = profile?.ward_id || 1;
      setWardId(assignedWardId);
      
      const assignedWard = wards?.find((w: any) => w.id === assignedWardId);
      setWardName(assignedWard ? assignedWard.name : 'Unknown Ward');

      // Fetch reports for that ward
      await fetchReports(assignedWardId);
    } catch (err: any) {
      console.error('Failed to load profile details:', err);
      showToast(`Error loading profile: ${err.message}`, 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Fetch reports for the ward
  const fetchReports = async (targetWardId: number) => {
    setIsDataLoading(true);
    setQueueError(null);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*, wards(name)')
        .contains('ward_ids', [targetWardId])
        .not('status', 'eq', 'pending_triage')
        .not('status', 'eq', 'rejected');
      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      const msg = err.message || 'Failed to load queue.';
      setQueueError(msg);
      showToast(`Failed to load queue: ${msg}`, 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Filter and Sort queue
  const getSortedReports = () => {
    let filtered = [...reports];

    // Filter Engine
    if (filters) {
      if (filters.keyword) {
        filtered = filtered.filter(r => (r.description || '').toLowerCase().includes(filters.keyword.toLowerCase()));
      }
      if (filters.category !== 'all') {
        filtered = filtered.filter(r => r.category === filters.category);
      }
      if (filters.severity !== 'all') {
        filtered = filtered.filter(r => r.severity === filters.severity);
      }
      if (filters.status !== 'all') {
        filtered = filtered.filter(r => r.status === filters.status);
      }
    }

    return filtered.sort((a, b) => {
      const sortBy = filters?.sortBy || 'highest_priority';
      
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      
      // Default: 'highest_priority' logic (manual review first, then severity, then oldest)
      const aReview = a.status === 'needs_manual_review';
      const bReview = b.status === 'needs_manual_review';
      if (aReview && !bReview) return -1;
      if (!aReview && bReview) return 1;

      const severityWeights: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const aWeight = severityWeights[a.severity] || 0;
      const bWeight = severityWeights[b.severity] || 0;
      if (aWeight !== bWeight) {
        return bWeight - aWeight; // Descending order
      }

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  };

  // Handle Authentication submit
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }
    setIsLoading(true);
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSession(data.session);
        showToast('Logged in successfully', 'success');
        fetchWorkerProfile(data.session.user);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSession(data.session);
        showToast('Worker account registered successfully!', 'success');
        fetchWorkerProfile(data.user);
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Log Out
  const handleLogOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast('Failed to sign out', 'error');
    } else {
      setSession(null);
      setWardId(null);
      setReports([]);
      showToast('Signed out successfully', 'info');
    }
  };

  // Update report status — routed through /api/resolve for server-side state-machine enforcement
  const handleStatusUpdate = async (
    reportId: string, 
    newStatus: string,
    extra?: { afterImage?: string | null; rejectionReason?: string | null; workerNotes?: string | null }
  ) => {
    setIsUpdatingStatus(true);
    try {
      // Retrieve the current session JWT to authenticate the request
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) throw new Error('No active session. Please log in again.');

      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          reportId,
          newStatus,
          // Client hints for mock/dev mode — server ignores these in production
          // (real mode reads from DB). Allows state-machine validation even when
          // the report only exists in the frontend's localStorage mock store.
          currentStatus: selectedReport?.status,
          wardId: wardId,
          // Additional resolution fields (Phase 2.3.5)
          afterImage: extra?.afterImage || null,
          rejectionReason: extra?.rejectionReason || null,
          workerNotes: extra?.workerNotes || null,
        }),
      });

      if (!res.ok) {
        // Parse the error message from the API response body
        let errMsg = `Server error (${res.status})`;
        try {
          const errBody = await res.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch (_) { /* ignore JSON parse failure */ }
        throw new Error(errMsg);
      }

      const resData = await res.json();

      // If mock mode, update localStorage report to keep UI in sync
      if (resData.mock) {
        const localReports = JSON.parse(localStorage.getItem('mock_db_reports') || '[]');
        const updatedReports = localReports.map((r: any) => {
          if (r.id === reportId) {
            return {
              ...r,
              status: newStatus,
      ...(newStatus === 'in_progress' ? { in_progress_at: new Date().toISOString() } : {}),
      ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
              after_image_url: resData.after_image_url || r.after_image_url,
              rejection_reason: extra?.rejectionReason || r.rejection_reason,
              worker_notes: extra?.workerNotes || r.worker_notes
            };
          }
          return r;
        });
        localStorage.setItem('mock_db_reports', JSON.stringify(updatedReports));
      }

      // Dispatch global event for local/mock Realtime Notifications
      window.dispatchEvent(new CustomEvent('mock-status-update', {
        detail: {
          reportId,
          newStatus,
          oldStatus: selectedReport?.status,
          reporterId: selectedReport?.reporter_id
        }
      }));

      showToast(`Status updated → ${newStatus.replace('_', ' ')}`, 'success');
      
      // Reset transition inputs
      setShowSubForm(null);
      setRejectionReasonInput('');
      setWorkerNotesInput('');
      setAfterImageBase64(null);

      if (wardId) fetchReports(wardId);
      
      // Keep selected report updated with resolved fields
      setSelectedReport(prev => prev ? { 
        ...prev, 
        status: newStatus,
      ...(newStatus === 'in_progress' ? { in_progress_at: new Date().toISOString() } : {}),
      ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
        after_image_url: resData.after_image_url || prev.after_image_url,
        rejection_reason: extra?.rejectionReason || prev.ai_analysis?.rejectionReason,
        worker_notes: extra?.workerNotes
      } : null);
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

    const handleThankCitizen = async (reportId: string) => {
      setIsUpdatingStatus(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) throw new Error('No active session.');

        // For mock backend, update localStorage directly
        const localReports = JSON.parse(localStorage.getItem('mock_db_reports') || '[]');
        const updatedReports = localReports.map((r: any) => {
          if (r.id === reportId) {
            return {
              ...r,
              worker_thanked_at: new Date().toISOString(),
              worker_thanked_by: currentSession.user.id
            };
          }
          return r;
        });
        localStorage.setItem('mock_db_reports', JSON.stringify(updatedReports));

        setSelectedReport(prev => prev ? { 
          ...prev, 
          worker_thanked_at: new Date().toISOString(),
          worker_thanked_by: currentSession.user.id
        } : null);

        // Find reporterId to dispatch event
        const reporterId = localReports.find((r: any) => r.id === reportId)?.reporter_id;
        if (reporterId) {
          window.dispatchEvent(
            new CustomEvent('mock-thank-citizen', {
              detail: { reporterId, workerId: currentSession.user.id }
            })
          );
        }

        if (wardId) fetchReports(wardId);

        showToast('Thank you sent to citizen!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to send thank you.', 'error');
      } finally {
        setIsUpdatingStatus(false);
      }
    };

    const closeModal = () => {
    setSelectedReport(null);
    setShowSubForm(null);
    setRejectionReasonInput('');
    setWorkerNotesInput('');
    setAfterImageBase64(null);
  };

  // Calculate stats values
  const totalAssigned = reports.length;
  const pendingCount = reports.filter(r => r.status === 'open' || r.status === 'needs_manual_review').length;
  const inProgressCount = reports.filter(r => r.status === 'in_progress').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved' || r.status === 'rejected').length;

  // Render Login state
  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col justify-center min-h-[75vh]">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
          
          <div className="text-center mb-6">
            <span className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
              <Lock className="w-6 h-6 animate-pulse" />
            </span>
            <h2 className="text-xl font-extrabold text-white">Worker Login Portal</h2>
            <p className="text-xs text-slate-400 mt-1">Access and manage civic issue triage queues</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="worker@downtown.com"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-3 pl-11 text-xs text-white focus:outline-none transition-all"
                  required
                />
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-3 pl-11 text-xs text-white focus:outline-none transition-all"
                  required
                />
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all flex justify-center items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  {authMode === 'login' ? 'Sign In as Worker' : 'Register New Worker'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {authMode === 'login' ? "Need a worker account? Register now" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Dashboard state
  const sortedQueue = getSortedReports();

  return (
    <div className="max-w-md mx-auto px-4 py-4">
      {/* Worker Header Card */}
      <div className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm mb-5">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md">
              Authorized Worker
            </span>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-sm mt-1.5 truncate max-w-[200px]">
              {session.user.email}
            </h3>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs mt-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Assigned: <strong>{wardName}</strong></span>
            </div>
          </div>
          <button 
            onClick={handleLogOut}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-2.5 text-center">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Total</span>
            <span className="text-sm font-black text-slate-800 dark:text-white mt-0.5 block">{totalAssigned}</span>
          </div>
          <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-2.5 text-center">
            <span className="block text-[10px] font-bold text-purple-500 dark:text-purple-400 uppercase">Pending</span>
            <span className="text-sm font-black text-purple-600 dark:text-purple-400 mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-2.5 text-center">
            <span className="block text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase">Active</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5 block">{inProgressCount}</span>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-2.5 text-center">
            <span className="block text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase">Done</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{resolvedCount}</span>
          </div>
        </div>
      </div>

      {/* Queue Header */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-extrabold text-slate-800 dark:text-white text-xs flex items-center gap-1.5 uppercase tracking-wider">
          <Inbox className="w-4 h-4 text-slate-400" />
          <span>Action Queue</span>
          <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400">
            {reports.length}
          </span>
        </h4>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors flex items-center ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setViewMode('route')}
              className={`p-1.5 rounded-lg transition-colors flex items-center ${viewMode === 'route' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
              title="Route Map View"
            >
              <Map className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            onClick={() => wardId && fetchReports(wardId)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800"
            title="Refresh Queue"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <SearchFilterEngine role="worker" onFilterChange={setFilters} />

      {/* Main Content Area (List or Map) */}
      {isDataLoading ? (
        <div className="flex flex-col justify-center items-center py-12">
          <RefreshCw className="w-6 h-6 text-indigo-550 animate-spin" />
          <span className="text-xs text-slate-400 mt-2 font-bold">Refreshing assigned queue...</span>
        </div>
      ) : queueError ? (
        <div className="p-5 text-center bg-rose-500/5 border border-rose-500/10 rounded-3xl">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2.5" />
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">Queue Load Failed</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">{queueError}</p>
          <button
            onClick={() => wardId && fetchReports(wardId)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      ) : sortedQueue.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-850 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Inbox className="w-8 h-8 text-slate-350 dark:text-slate-700 mx-auto mb-2.5" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">All clean! No reports assigned to this ward.</p>
        </div>
      ) : viewMode === 'route' ? (
        <WorkerRouteMap 
          stops={sortedQueue.filter(r => r.status !== 'resolved' && r.status !== 'rejected')}
          onMarkerClick={(id) => {
            const r = reports.find(x => x.id === id);
            if (r) setSelectedReport(r);
          }}
        />
      ) : (
        <div className="space-y-3">
          {sortedQueue.map(report => (
            <div 
              key={report.id}
              className="bg-white dark:bg-slate-850 border border-slate-200/75 dark:border-slate-800/85 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md rounded-2xl p-3 flex gap-3 transition-all cursor-pointer group"
              onClick={() => setSelectedReport(report)}
            >
              {/* Thumbnail Photo */}
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                <img 
                  src={report.image_url} 
                  alt={report.category}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Card Meta details */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="flex justify-between items-start gap-1">
                  <div className="flex flex-wrap gap-1">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${CATEGORY_COLORS[report.category] || 'bg-slate-100 text-slate-600'}`}>
                      {report.category}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${SEVERITY_COLORS[report.severity] || 'bg-slate-100 text-slate-600'}`}>
                      {report.severity}
                    </span>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${STATUS_BADGES[report.status] || 'bg-slate-100 text-slate-600'}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold truncate mt-1">
                  {report.description || 'No description provided.'}
                </p>

                <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">
                  <span>{new Date(report.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Manage Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-950/45 text-white hover:bg-slate-950/65 hover:scale-105 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Large Image View */}
            <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-950">
              <img 
                src={selectedReport.image_url} 
                alt="Full issue view" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              
              {/* Category / Severity overlays */}
              <div className="absolute bottom-4 left-4 flex gap-1.5">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${CATEGORY_COLORS[selectedReport.category]}`}>
                  {selectedReport.category}
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${SEVERITY_COLORS[selectedReport.severity]}`}>
                  {selectedReport.severity}
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_BADGES[selectedReport.status]}`}>
                  {selectedReport.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[50vh] overflow-y-auto space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Citizen Description</span>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
                  {selectedReport.description || 'No description notes provided.'}
                </p>
              </div>

              {selectedReport.ai_analysis && (
                <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>AI Triage Insights</span>
                    {selectedReport.ai_analysis.confidence && (
                      <span className="ml-auto bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[9px]">
                        Conf: {(selectedReport.ai_analysis.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium italic leading-relaxed">
                    "{selectedReport.ai_analysis.explanation}"
                  </p>
                </div>
              )}

              {/* Coordinates / Map details */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 px-3.5 py-2.5 rounded-2xl">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold">
                  <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="truncate">{selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)}</span>
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.latitude},${selectedReport.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase"
                >
                  Navigate
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-150 dark:border-slate-850 flex flex-col gap-3">
              {showSubForm === 'resolve' ? (
                <div className="w-full space-y-3 p-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Resolve Report</span>
                    <button 
                      onClick={() => { setShowSubForm(null); setAfterImageBase64(null); }}
                      className="text-xs text-indigo-505 hover:text-indigo-600 font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  {/* Photo Capture / Upload */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">After Photo *</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="after-photo-upload"
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setAfterImageBase64(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label 
                      htmlFor="after-photo-upload"
                      className="flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer min-h-[90px]"
                    >
                      {afterImageBase64 ? (
                        <img src={afterImageBase64} className="max-h-24 object-contain rounded-lg" alt="Preview" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] font-bold text-slate-405 uppercase tracking-wider">Take Photo or Upload Image</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Worker Notes */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Worker Notes (Optional)</label>
                    <textarea 
                      placeholder="Add notes about the resolution..." 
                      value={workerNotesInput}
                      onChange={(e) => setWorkerNotesInput(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-955 focus:outline-none focus:border-indigo-500 min-h-[50px] resize-none text-slate-800 dark:text-slate-150"
                    />
                  </div>

                  <button 
                    disabled={isUpdatingStatus || !afterImageBase64}
                    onClick={() => handleStatusUpdate(selectedReport.id, 'resolved', { afterImage: afterImageBase64, workerNotes: workerNotesInput })}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-505 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-extrabold text-xs transition-colors flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isUpdatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Resolution'}
                  </button>
                </div>
              ) : showSubForm === 'reject' ? (
                <div className="w-full space-y-3 p-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Reject Report</span>
                    <button 
                      onClick={() => { setShowSubForm(null); setRejectionReasonInput(''); }}
                      className="text-xs text-indigo-505 hover:text-indigo-600 font-bold"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Rejection Reason */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rejection Reason *</label>
                    <textarea 
                      placeholder="Why is this report rejected? (mandatory)" 
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-955 focus:outline-none focus:border-indigo-500 min-h-[60px] text-slate-800 dark:text-slate-150"
                      required
                    />
                  </div>

                  {/* Worker Notes */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Worker Notes (Optional)</label>
                    <textarea 
                      placeholder="Internal internal notes..." 
                      value={workerNotesInput}
                      onChange={(e) => setWorkerNotesInput(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-955 focus:outline-none focus:border-indigo-500 min-h-[50px] resize-none text-slate-800 dark:text-slate-150"
                    />
                  </div>

                  <button 
                    disabled={isUpdatingStatus || !rejectionReasonInput.trim()}
                    onClick={() => handleStatusUpdate(selectedReport.id, 'rejected', { rejectionReason: rejectionReasonInput, workerNotes: workerNotesInput })}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-505 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-extrabold text-xs transition-colors flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isUpdatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Rejection'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 w-full">
                  {selectedReport.status === 'open' || selectedReport.status === 'needs_manual_review' ? (
                    <button
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusUpdate(selectedReport.id, 'in_progress')}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-colors flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {isUpdatingStatus ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <TrendingUp className="w-3.5 h-3.5" />
                          Start Investigation
                        </>
                      )}
                    </button>
                  ) : selectedReport.status === 'in_progress' ? (
                    <>
                      <button
                        onClick={() => setShowSubForm('resolve')}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-colors flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve Issue
                      </button>
                      <button
                        onClick={() => setShowSubForm('reject')}
                        className="flex-1 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-505 text-white font-extrabold text-xs transition-colors flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject Report
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="text-center py-2 text-xs font-bold text-slate-400 dark:text-slate-500 flex justify-center items-center gap-1">
                        {selectedReport.status === 'resolved' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <X className="w-4 h-4 text-rose-500" />
                        )}
                        <span>Status is locked ({selectedReport.status})</span>
                      </div>
                      
                      {selectedReport.status === 'resolved' && !selectedReport.worker_thanked_at && (
                        <button 
                          disabled={isUpdatingStatus}
                          onClick={() => handleThankCitizen(selectedReport.id)}
                          className="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:bg-slate-300 text-white font-extrabold text-xs transition-colors flex justify-center items-center gap-1.5 shadow-sm"
                        >
                          <Heart className="w-4 h-4" />
                          Send Citizen a Thank You!
                        </button>
                      )}
                      
                      {selectedReport.status === 'resolved' && selectedReport.worker_thanked_at && (
                         <div className="text-center py-2 text-xs font-bold text-pink-500 flex justify-center items-center gap-1.5 bg-pink-50 dark:bg-pink-500/10 rounded-xl border border-pink-100 dark:border-pink-500/20">
                            <Heart className="w-4 h-4 fill-pink-500" /> 
                            Citizen Thanked!
                         </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
