import React, { useState, useEffect, useRef } from 'react';
import { showToast } from '../lib/toast';
import imageCompression from 'browser-image-compression';
import { OfflineQueueService } from '../lib/OfflineQueueService';
import { supabase } from '../lib/supabaseClient';
import { 
  Camera, 
  MapPin, 
  Upload, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  RefreshCw,
  AlertCircle,
  Sparkles,
  Info,
  CloudOff
} from 'lucide-react';

interface TriageResult {
  category: 'pothole' | 'garbage' | 'streetlight' | 'water leakage' | 'drainage';
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  isValidCivicIssue: boolean;
  isBorderline: boolean;
  confidence: number;
  rejectionReason: string;
  status: string;
  segmentation_mask: {
    box_2d: [number, number, number, number];
    label: string;
  };
}




export default function ReportScreen() {
  // Form State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  
  // Geolocation State
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Flow & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<TriageResult & { imageUrl: string; wardName: string; isOffline?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // 1. Get reporter ID on mount (anonymous UUID)
  const [reporterId] = useState<string>(() => {
    let id = localStorage.getItem('reporter_id');
    if (!id) {
      // standard RFC4122 v4 UUID generator fallback
      id = 'f' + (Math.random().toString(36).substring(2, 17) + Math.random().toString(36).substring(2, 17)).substring(0, 35);
      localStorage.setItem('reporter_id', id);
    }
    return id;
  });

  // 2. Fetch Location on Mount & Offline Queue
  useEffect(() => {
    fetchLocation();
    
    const refreshQueueCount = async () => {
      const queue = await OfflineQueueService.getQueue();
      setOfflineQueueCount(queue.length);
    };
    refreshQueueCount();
    window.addEventListener('offline-queue-updated', refreshQueueCount);
    
    const syncOffline = async () => {
      const queue = await OfflineQueueService.getQueue();
      if (queue.length > 0 && navigator.onLine) {
        setIsSyncingOffline(true);
        await OfflineQueueService.sync();
        setIsSyncingOffline(false);
      }
    };
    
    window.addEventListener('online', syncOffline);
    window.addEventListener('focus', syncOffline);
    const interval = setInterval(syncOffline, 60000); // Check every minute
    
    return () => {
      window.removeEventListener('offline-queue-updated', refreshQueueCount);
      window.removeEventListener('online', syncOffline);
      window.removeEventListener('focus', syncOffline);
      clearInterval(interval);
    };
  }, []);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Using fallback.');
      setLatitude(12.9716);
      setLongitude(77.5946);
      showToast('Using fallback location.', 'info');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGeoLoading(false);
        showToast('GPS location updated!', 'success');
      },
      (error) => {
        console.warn('Geolocation error:', error);
        let msg = 'Failed to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please enable GPS permissions.';
        }
        setGeoError(msg);
        setGeoLoading(false);
        // Fallback default coordinates (Bengaluru Center for our seeded wards)
        setLatitude(12.9716);
        setLongitude(77.5946);
        showToast('Using fallback location.', 'info');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 3. Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setSubmitError(null);
    }
  };

  // 6. Handle Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setSubmitError('Please select or capture a photo of the issue.');
      return;
    }
    if (latitude === null || longitude === null) {
      setSubmitError('GPS location is required to submit a report.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    let base64Data = '';
    const client_submission_id = crypto.randomUUID();

    try {
      // Step A: Image Compression
      setSubmissionStep('Compressing image file...');
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(imageFile, options);

      // Step B: Convert to Base64 for fallback Offline Queue
      setSubmissionStep('Converting image for analysis...');
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(compressedFile);
      });

      // NEW STEP: Upload to Supabase Storage temporarily
      setSubmissionStep('Uploading image to secure storage...');
      const fileExt = imageFile.type.split('/')[1] || 'jpg';
      const tempStoragePath = `temp/${client_submission_id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(tempStoragePath, compressedFile, {
          contentType: imageFile.type,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Step C: Trigger Triage Serverless Function via Webhook (Database Insert)
      setSubmissionStep('Submitting civic report to server...');
      
      const { error: insertError } = await supabase.from('reports').insert({
        reporter_id: reporterId,
        image_url: tempStoragePath,
        description: description || '',
        latitude: latitude,
        longitude: longitude,
        status: 'pending_triage',
        category: 'unknown',
        severity: 'unknown',
        dedupe_hash: `client_id_${client_submission_id}`
      });

      if (insertError) {
        if (insertError.code === '23505') {
            setIsSubmitting(false);
            setSubmitError(`Duplicate Submission: This report appears to be already submitted.`);
            showToast('Duplicate report detected.', 'error');
            return;
        }
        throw new Error(`Database save failed: ${insertError.message}`);
      }

      // Success State
      showToast('Civic report queued for AI processing!', 'success');
      setSuccessResult({
        category: 'unknown' as any,
        severity: 'unknown' as any,
        explanation: 'Your report is currently being analyzed by our AI system. It will appear on the map shortly!',
        isValidCivicIssue: true,
        isBorderline: false,
        confidence: 0,
        rejectionReason: '',
        segmentation_mask: { box_2d: [0,0,0,0], label: '' },
        status: 'pending_triage',
        imageUrl: base64Data,
        wardName: 'Pending Match'
      });
      setIsSubmitting(false);
      
    } catch (err: any) {
      console.error('Submission error:', err);
      if (!navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Storage upload failed')) {
        try {
          await OfflineQueueService.enqueue({
            image: base64Data,
            mimeType: imageFile.type,
            reporterId: reporterId,
            description: description,
            latitude: latitude,
            longitude: longitude,
            client_submission_id
          });
          setSuccessResult({
            isOffline: true,
            category: 'pothole', // Fallback value, won't be displayed
            severity: 'low',     // Fallback value
            explanation: '',
            isValidCivicIssue: true,
            isBorderline: false,
            confidence: 1,
            rejectionReason: '',
            status: 'pending',
            segmentation_mask: { box_2d: [0,0,0,0], label: '' },
            imageUrl: base64Data,
            wardName: 'Pending Sync'
          });
          showToast('Saved offline. Will sync when you reconnect.', 'info');
        } catch (queueErr: any) {
          setSubmitError(queueErr.message || 'Could not save offline.');
          showToast('Failed to save offline', 'error');
        }
      } else {
        const errMsg = err.message || 'An error occurred while submitting your report. Please try again.';
        setSubmitError(errMsg);
        showToast(errMsg, 'error');
      }
      setIsSubmitting(false);
    }
  };

  // Reset form for new submission
  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setDescription('');
    setSuccessResult(null);
    setSubmitError(null);
    fetchLocation();
  };

  return (
    <div className="max-w-md mx-auto my-6 px-4 md:px-0">
      {/* Brand & Heading */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Civic Reporting
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
          Community Hero
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Capture and report local infrastructure issues. Instantly triaged by AI.
        </p>
      </div>

      {/* Success View */}
      {successResult && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-6">
            {successResult.isOffline ? (
              <>
                <div className="inline-flex p-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 mb-3">
                  <CloudOff className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Saved Offline
                </h2>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">
                  Will sync automatically when connected
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-3">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Report Submitted!
                </h2>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  Assigned to {successResult.wardName}
                </p>
              </>
            )}
          </div>

          {/* Borderline Issue Warning */}
          {successResult.status === 'needs_manual_review' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 text-xs font-semibold flex gap-2.5 items-start mb-5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Manual Verification Required</p>
                <p className="mt-0.5 leading-relaxed font-normal">{successResult.rejectionReason || 'Borderline or ambiguous issue detected.'}</p>
              </div>
            </div>
          )}

          {/* Low Confidence Warning */}
          {successResult.status === 'open' && successResult.confidence < 0.70 && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 text-xs font-semibold flex gap-2.5 items-start mb-5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Low AI Confidence Flagged</p>
                <p className="mt-0.5 leading-relaxed font-normal">
                  AI classification confidence is only {(successResult.confidence * 100).toFixed(0)}%. This report has been flagged for manual verification.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 mb-5 relative aspect-video bg-slate-50">
            <img 
              src={successResult.imageUrl} 
              alt="Submitted report" 
              className="w-full h-full object-cover"
            />
            {/* Draw Bounding Box Overlay if available */}
            {successResult.segmentation_mask?.box_2d && successResult.segmentation_mask.box_2d.some(v => v !== 0) && (
              <div 
                className="absolute border-2 border-red-500 bg-red-500/10 rounded pointer-events-none"
                style={{
                  top: `${successResult.segmentation_mask.box_2d[0] / 10}%`,
                  left: `${successResult.segmentation_mask.box_2d[1] / 10}%`,
                  height: `${(successResult.segmentation_mask.box_2d[2] - successResult.segmentation_mask.box_2d[0]) / 10}%`,
                  width: `${(successResult.segmentation_mask.box_2d[3] - successResult.segmentation_mask.box_2d[1]) / 10}%`,
                }}
              >
                <span className="absolute -top-6 left-0 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded shadow font-bold uppercase tracking-wider">
                  {successResult.segmentation_mask.label || successResult.category}
                </span>
              </div>
            )}
          </div>

          {/* AI Decision Details Card */}
          {!successResult.isOffline && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3 mb-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-slate-800/50">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Classification</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/30">
                {successResult.category}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-slate-800/50">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Severity</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                successResult.severity === 'high' 
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/50 dark:border-rose-900/30'
                  : successResult.severity === 'medium'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/30'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/30'
              }`}>
                {successResult.severity}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">AI Explanation</span>
              <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                "{successResult.explanation}"
              </p>
            </div>
          </div>
          )}

          <button
            onClick={handleReset}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer flex justify-center items-center gap-2"
          >
            Submit Another Report
          </button>
        </div>
      )}

      {/* Main Report Form */}
      {!successResult && (
        <div className="space-y-6">
          {offlineQueueCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <CloudOff className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Offline Queue</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">{offlineQueueCount} report(s) waiting to sync</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  setIsSyncingOffline(true);
                  await OfflineQueueService.sync();
                  setIsSyncingOffline(false);
                }}
                disabled={isSyncingOffline || !navigator.onLine}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-2"
              >
                {isSyncingOffline ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sync
              </button>
            </div>
          )}
          <form 
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl space-y-6"
          >
            {/* 1. Photo Capture / Select Area */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Capture Issue Photo <span className="text-rose-500">*</span>
            </label>
            
            {imagePreview ? (
              <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 aspect-video flex items-center justify-center">
                <img 
                  src={imagePreview} 
                  alt="Issue preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => { if (!isSubmitting) { setImageFile(null); setImagePreview(null); } }}
                  disabled={isSubmitting}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white font-semibold gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Camera className="w-5 h-5" />
                  Change Photo
                </button>
              </div>
            ) : (
              <div 
                onClick={() => !isSubmitting && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-purple-500 dark:hover:border-purple-500/70 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all duration-200 flex flex-col items-center justify-center gap-3 group ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="p-3 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-200">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Take Photo or Upload Image
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Accepts mobile camera capture or photo files
                  </p>
                </div>
              </div>
            )}
            
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment" // Forces back camera on mobile
              className="hidden"
            />
          </div>

          {/* 2. Geolocation Widget */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                latitude !== null 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">GPS Location</span>
                {geoLoading ? (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching location...
                  </span>
                ) : geoError ? (
                  <span className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {geoError}
                  </span>
                ) : latitude !== null ? (
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {latitude.toFixed(5)}, {longitude?.toFixed(5)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Not obtained</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={fetchLocation}
              disabled={geoLoading || isSubmitting}
              className="p-2.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh Location"
            >
              <RefreshCw className={`w-4 h-4 ${geoLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* 3. Description Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              Description / Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Provide details about the issue (e.g. large pothole on main road, overflowing garbage container...)"
              rows={3}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Error Message Display */}
          {submitError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex gap-2.5 items-start">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Submission Failed</p>
                <p className="mt-0.5 leading-relaxed font-normal">{submitError}</p>
              </div>
            </div>
          )}

          {/* 4. Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !imageFile || latitude === null}
            className="w-full py-4.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:shadow-none flex justify-center items-center gap-2.5 cursor-pointer disabled:cursor-not-allowed text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{submissionStep}</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>File Civic Report</span>
              </>
            )}
          </button>

          {/* Anonymous Info Banner */}
          <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-slate-400 dark:text-slate-500 text-[11px] leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Reporting is anonymous. A persistent reporter ID has been generated in your browser. All submissions are public.
            </p>
          </div>
        </form>
        </div>
      )}
    </div>
  );
}
