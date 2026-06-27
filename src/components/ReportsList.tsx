import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { showToast } from '../lib/toast';
import { 
  MapPin, 
  AlertTriangle, 
  X, 
  Clock, 
  User, 
  Compass, 
  RefreshCw,
  Sparkles,
  Map,
  Eye,
  CheckCircle2,
  Star
} from 'lucide-react';

interface Report {
  id: string;
  created_at: string;
  reporter_id: string;
  image_url: string;
  after_image_url?: string;
  rejection_reason?: string;
  worker_notes?: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  severity: string;
  status: string;
  ward_id: number;
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
    segmentation_mask?: {
      box_2d: [number, number, number, number];
      label: string;
    };
  };
}

export default function ReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('all');
  
  // Modal State
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // User Current Location (for distance calculation)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Get reporter ID (anonymous UUID)
  const [reporterId] = useState<string>(() => {
    return localStorage.getItem('reporter_id') || '';
  });

  // Survey & Photo tab state variables (Phase 2.3.5)
  const [activePhotoTab, setActivePhotoTab] = useState<'before' | 'after'>('before');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [existingFeedback, setExistingFeedback] = useState<{ rating: number; comment: string } | null>(null);

  // Fetch feedback for selected report when details modal is opened
  useEffect(() => {
    if (selectedReport) {
      setActivePhotoTab('before');
      setFeedbackRating(5);
      setFeedbackComment('');
      setExistingFeedback(null);
      
      const fetchFeedback = async () => {
        try {
          const { data, error } = await supabase
            .from('report_feedback')
            .select('*')
            .eq('report_id', selectedReport.id)
            .maybeSingle();
          
          if (!error && data) {
            setExistingFeedback({ rating: data.rating, comment: data.comment });
          }
        } catch (err) {
          console.error('Error fetching feedback:', err);
        }
      };
      fetchFeedback();
    }
  }, [selectedReport]);

  // Fetch reports and location on mount
  useEffect(() => {
    fetchLocation();
    fetchReports();
  }, []);

  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          console.warn('Could not retrieve user location for distance mapping:', err);
        }
      );
    }
  };

  const fetchReports = async (isManual = false) => {
    setLoading(true);
    setError(null);
    try {
      // Query reports and join wards
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('*, wards(name)')
        .not('status', 'eq', 'pending_triage')
        .not('status', 'eq', 'rejected')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setReports(data || []);
      if (isManual) {
        showToast('Filings list updated!', 'success');
      }
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports from database.');
      if (isManual) {
        showToast('Failed to refresh filings.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedReport) return;
    setIsSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('report_feedback')
        .insert({
          report_id: selectedReport.id,
          rating: feedbackRating,
          comment: feedbackComment || null
        });

      if (error) throw error;
      
      // If mock, save to local storage to keep client in sync
      const localReports = JSON.parse(localStorage.getItem('mock_db_reports') || '[]');
      const isMock = localReports.length > 0;
      if (isMock) {
        const localFeedback = JSON.parse(localStorage.getItem('mock_db_report_feedback') || '[]');
        const exists = localFeedback.some((f: any) => f.report_id === selectedReport.id);
        if (!exists) {
          localFeedback.push({
            id: 'mock-fb-' + Math.random().toString(36).slice(2),
            report_id: selectedReport.id,
            rating: feedbackRating,
            comment: feedbackComment || null,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('mock_db_report_feedback', JSON.stringify(localFeedback));
        }
      }

      showToast('Thank you for your feedback!', 'success');
      setExistingFeedback({ rating: feedbackRating, comment: feedbackComment });
    } catch (err: any) {
      showToast(`Failed to submit feedback: ${err.message}`, 'error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Distance calculator helper
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter reports based on tab
  const filteredReports = reports.filter(r => {
    if (activeTab === 'my') {
      return r.reporter_id === reporterId;
    }
    return true;
  });

  // Sort by Proximity if location is available and tab is 'all'
  const getSortedReports = () => {
    if (userCoords && activeTab === 'all') {
      return [...filteredReports].sort((a, b) => {
        const distA = getDistance(userCoords.lat, userCoords.lng, a.latitude, a.longitude);
        const distB = getDistance(userCoords.lat, userCoords.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    }
    return filteredReports;
  };

  const sortedReports = getSortedReports();

  return (
    <div className="max-w-md mx-auto my-6 px-4 md:px-0">
      {/* Tab Switcher */}
      <div className="flex bg-slate-200/60 dark:bg-slate-800 p-1.5 rounded-2xl mb-6 border border-slate-200/50 dark:border-slate-700/50">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer flex justify-center items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          All Submissions
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer flex justify-center items-center gap-2 ${
            activeTab === 'my'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          My Reports
        </button>
      </div>

      {/* Header and Refresh */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {activeTab === 'all' ? 'Nearby Issues' : 'My Filings'}
          <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 font-semibold">
            {sortedReports.length}
          </span>
        </h2>
        <button
          onClick={() => fetchReports(true)}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex gap-2.5 items-center">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State - Skeleton Cards */}
      {loading && sortedReports.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div 
              key={n}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex gap-4 items-center animate-pulse"
            >
              {/* Photo Thumbnail Skeleton */}
              <div className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
              
              {/* Card Meta Content Skeleton */}
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              </div>

              {/* Status Indicator Skeleton */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedReports.length === 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400">
            <Map className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">No Reports Found</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
              {activeTab === 'all' 
                ? 'No civic issues have been filed in your area yet. Be the first to report!' 
                : 'You have not submitted any reports yet. Go to the file screen to submit one.'}
            </p>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        {sortedReports.map((report) => {
          const formattedDate = new Date(report.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          // Calculate distance if coordinates are loaded
          const distance = userCoords 
            ? getDistance(userCoords.lat, userCoords.lng, report.latitude, report.longitude)
            : null;

          return (
            <div
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer flex gap-4 items-center group relative overflow-hidden"
            >
              {/* Photo Thumbnail */}
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100 dark:border-slate-700">
                <img 
                  src={report.image_url} 
                  alt={report.category} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              {/* Card Meta Content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex gap-2 items-center">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/30">
                    {report.category}
                  </span>
                  
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    report.severity === 'high' 
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/30'
                      : report.severity === 'medium'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/30'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/30'
                  }`}>
                    {report.severity}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {report.description || `Reported ${report.category}`}
                </h3>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formattedDate}
                  </span>
                  {distance !== null ? (
                    <span className="flex items-center gap-1 font-semibold text-purple-500 dark:text-purple-400">
                      <MapPin className="w-3.5 h-3.5" />
                      {distance < 0.1 ? 'Nearby' : `${distance.toFixed(1)} km away`}
                    </span>
                  ) : report.wards?.name ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {report.wards.name}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-extrabold uppercase border ${
                  report.status === 'resolved'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/40'
                    : report.status === 'in_progress'
                    ? 'bg-blue-55 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200/40'
                    : 'bg-slate-50 text-slate-500 dark:bg-slate-900/50 dark:text-slate-400 border-slate-200'
                }`}>
                  {report.status === 'resolved' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3 animate-pulse" />
                  )}
                  {report.status.replace('_', ' ')}
                </span>
                
                <div className="p-1 rounded-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 group-hover:text-purple-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-950/40 transition-colors">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal Overlay */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Filing Details</h3>
                <p className="text-xs text-slate-400">ID: {selectedReport.id.substring(0, 8)}...</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-5 space-y-5 flex-1">
              
              {/* Photo Tab Selector (Before/After) */}
              {selectedReport.after_image_url && (
                <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/30 dark:border-slate-800">
                  <button 
                    onClick={() => setActivePhotoTab('before')}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      activePhotoTab === 'before' 
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Before (Reported)
                  </button>
                  <button 
                    onClick={() => setActivePhotoTab('after')}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      activePhotoTab === 'after' 
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    After (Resolved)
                  </button>
                </div>
              )}

              {/* Image Preview with Bounding Box Overlay */}
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                {activePhotoTab === 'before' || !selectedReport.after_image_url ? (
                  <>
                    <img 
                      src={selectedReport.image_url} 
                      alt={selectedReport.category} 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Bounding Box Render */}
                    {selectedReport.ai_analysis?.segmentation_mask?.box_2d && 
                     selectedReport.ai_analysis.segmentation_mask.box_2d.some(v => v !== 0) && (
                      <div 
                        className="absolute border-2 border-red-500 bg-red-500/15 rounded pointer-events-none"
                        style={{
                          top: `${selectedReport.ai_analysis.segmentation_mask.box_2d[0] / 10}%`,
                          left: `${selectedReport.ai_analysis.segmentation_mask.box_2d[1] / 10}%`,
                          height: `${(selectedReport.ai_analysis.segmentation_mask.box_2d[2] - selectedReport.ai_analysis.segmentation_mask.box_2d[0]) / 10}%`,
                          width: `${(selectedReport.ai_analysis.segmentation_mask.box_2d[3] - selectedReport.ai_analysis.segmentation_mask.box_2d[1]) / 10}%`,
                        }}
                      >
                        <span className="absolute -top-6 left-0 bg-red-500 text-white text-[9px] px-1 py-0.5 rounded shadow font-extrabold uppercase tracking-wider">
                          {selectedReport.ai_analysis.segmentation_mask.label || selectedReport.category}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <img 
                    src={selectedReport.after_image_url} 
                    alt="Resolved issue fix" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Status & Severity Pill Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/30 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedReport.status === 'resolved' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : selectedReport.status === 'in_progress' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedReport.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/30 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Severity</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedReport.severity === 'high' 
                      ? 'bg-rose-100 text-rose-800' 
                      : selectedReport.severity === 'medium'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedReport.severity}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/30 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Ward</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block truncate">
                    {selectedReport.wards?.name || `Ward ID ${selectedReport.ward_id}`}
                  </span>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Description</span>
                <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 leading-relaxed">
                  {selectedReport.description || <span className="text-slate-400 italic">No notes provided.</span>}
                </p>
              </div>

              {/* AI Analysis Explanation Card */}
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4.5 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2.5 text-purple-500/15 pointer-events-none">
                  <Sparkles className="w-12 h-12" />
                </div>
                <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Triage Context
                  </span>
                  {selectedReport.ai_analysis?.confidence !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-[10px] font-bold">
                      Confidence: {(selectedReport.ai_analysis.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic pr-4">
                  "{selectedReport.ai_analysis?.explanation}"
                </p>
              </div>

              {/* Geolocation Coordinate Cards */}
              <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-500">Location Point: </span>
                  <code className="text-slate-700 dark:text-slate-300 font-mono">
                    {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                  </code>
                </div>
              </div>

              {/* Rejection / Worker notes section (Phase 2.3.5) */}
              {(selectedReport.rejection_reason || selectedReport.worker_notes) && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/30 rounded-2xl p-4.5">
                  {selectedReport.rejection_reason && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Rejection Reason</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-bold">
                        {selectedReport.rejection_reason}
                      </p>
                    </div>
                  )}
                  {selectedReport.worker_notes && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Worker Resolution Notes</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic pr-4">
                        "{selectedReport.worker_notes}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reporter Satisfaction Survey Card (Phase 2.3.5) */}
              {activeTab === 'my' && selectedReport.status === 'resolved' && (
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4.5 space-y-3">
                  <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500" />
                    <span>Resolution Satisfaction Survey</span>
                  </h4>
                  
                  {existingFeedback ? (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-4.5 h-4.5 ${star <= existingFeedback.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      {existingFeedback.comment && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic pr-2">
                          "{existingFeedback.comment}"
                        </p>
                      )}
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block">Feedback Submitted</span>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Please rate the resolution of this issue to help us improve city services:
                      </p>
                      
                      {/* Star rating selector */}
                      <div className="flex gap-1.5 justify-center py-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFeedbackRating(star)}
                            className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star 
                              className={`w-6 h-6 ${star <= feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'}`} 
                            />
                          </button>
                        ))}
                      </div>

                      {/* Comment text area */}
                      <textarea
                        placeholder="Add comments or notes about the fix (optional)..."
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 min-h-[50px] resize-none"
                      />

                      <button
                        disabled={isSubmittingFeedback}
                        onClick={handleFeedbackSubmit}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex justify-center items-center gap-1.5 shadow"
                      >
                        {isSubmittingFeedback ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Submit Survey'}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-slate-200/50 dark:border-slate-700/50 flex bg-slate-50 dark:bg-slate-900/50 justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
