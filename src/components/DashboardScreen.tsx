import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { showToast } from '../lib/toast';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  AlertTriangle, 
  MapPin, 
  TrendingUp, 
  Eye, 
  X, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

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
  ward_id: number;
  wards?: {
    name: string;
  };
  ai_analysis: {
    category: string;
    severity: string;
    explanation: string;
    confidence?: number;
    segmentation_mask?: {
      box_2d: [number, number, number, number];
      label: string;
    };
  };
}

// Color maps for mapping and charts
const CATEGORY_COLORS: Record<string, string> = {
  pothole: '#ef4444',      // Red
  garbage: '#f97316',      // Orange
  streetlight: '#eab308',  // Yellow/Amber
  'water leakage': '#3b82f6', // Blue
  drainage: '#8b5cf6'      // Purple
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#10b981',    // Emerald
  medium: '#f59e0b', // Amber
  high: '#f43f5e'    // Rose
};

// Create custom leaflet marker dots
const createCustomIcon = (category: string) => {
  const color = CATEGORY_COLORS[category] || '#6b7280';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3); transform: translate(-1px, -1px);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

export default function DashboardScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // User Current Geolocation
  const [userLocation, setUserLocation] = useState<[number, number]>([12.9716, 77.5946]); // Default Bengaluru
  const [mapZoom, setMapZoom] = useState(12);

  useEffect(() => {
    fetchLocation();
    fetchReports();
  }, []);

  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setMapZoom(13);
        },
        (err) => {
          console.warn('Geolocation failed in dashboard, using default center:', err);
        }
      );
    }
  };

  const fetchReports = async (isManual = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('*, wards(name)')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setReports(data || []);
      if (isManual) {
        showToast('Dashboard metrics updated!', 'success');
      }
    } catch (err: any) {
      console.error('Error loading dashboard reports:', err);
      setError('Failed to fetch dashboard metrics.');
      if (isManual) {
        showToast('Failed to refresh metrics.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Calculate General Metrics
  const totalReports = reports.length;
  const openCount = reports.filter(r => r.status === 'open').length;
  const reviewCount = reports.filter(r => r.status === 'needs_manual_review').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const resolvedRate = totalReports > 0 ? (resolvedCount / totalReports) * 100 : 0;

  // 2. Prepare Category Chart Data
  const categories = ['pothole', 'garbage', 'streetlight', 'water leakage', 'drainage'];
  const categoryChartData = categories.map(cat => {
    const count = reports.filter(r => r.category === cat).length;
    return {
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      count,
      color: CATEGORY_COLORS[cat]
    };
  });

  // 3. Prepare Severity Chart Data
  const severities = ['low', 'medium', 'high'];
  const severityChartData = severities.map(sev => {
    const value = reports.filter(r => r.severity === sev).length;
    return {
      name: sev.toUpperCase(),
      value,
      color: SEVERITY_COLORS[sev]
    };
  }).filter(item => item.value > 0);

  return (
    <div className="max-w-md mx-auto my-6 px-4 md:px-0 space-y-6 animate-in fade-in duration-200">
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex gap-2.5 items-center">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dashboard Top Header */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
          Civic Dashboard
        </h2>
        <button
          onClick={() => fetchReports(true)}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* 1. Summary Cards Grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', colorClass: 'text-slate-800 dark:text-white', val: totalReports },
          { label: 'Open', colorClass: 'text-amber-600 dark:text-amber-500', val: openCount },
          { label: 'Review', colorClass: 'text-purple-600 dark:text-purple-400', val: reviewCount },
          { label: 'Resolved', colorClass: 'text-emerald-600 dark:text-emerald-500', val: `${resolvedRate.toFixed(0)}%` }
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-center shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{card.label}</span>
            {loading && totalReports === 0 ? (
              <div className="h-6 w-8 bg-slate-200 dark:bg-slate-700 rounded mx-auto mt-1.5 animate-pulse" />
            ) : (
              <span className={`text-xl font-extrabold ${card.colorClass} mt-1 block`}>
                {card.val}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 2. Interactive Map Container */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 shadow-md space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-purple-500" />
            Live Issue Mapping
          </h3>
          <span className="text-xs text-slate-400 font-medium">Click markers for details</span>
        </div>

        <div className="h-64 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative z-10">
          {loading ? (
            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900/80 flex flex-col items-center justify-center gap-3 animate-pulse">
              <div className="relative w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <div className="absolute w-8 h-8 rounded-full bg-purple-500/20 dark:bg-purple-400/20 animate-ping" />
                <MapPin className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Initializing Leaflet Map...</span>
            </div>
          ) : (
            <MapContainer 
              center={userLocation} 
              zoom={mapZoom} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {reports.map((report) => (
                <Marker 
                  key={report.id} 
                  position={[report.latitude, report.longitude]}
                  icon={createCustomIcon(report.category)}
                >
                  <Popup>
                    <div className="text-xs space-y-1.5 p-1 w-44">
                      <div className="h-20 rounded-md overflow-hidden bg-slate-100 mb-1 border border-slate-100">
                        <img 
                          src={report.image_url} 
                          alt={report.category} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold uppercase text-[9px] text-purple-600 block">
                          {report.category}
                        </span>
                        <span className={`px-1 rounded font-bold uppercase text-[8px] ${
                          report.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {report.description || `Reported ${report.category}`}
                      </p>
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="w-full py-1 mt-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold flex justify-center items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        Inspect Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>

      {/* 3. Recharts Statistics Panel */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-md space-y-5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-3">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          Analytics & Statistics
        </h3>

        {/* Category Count Bar Chart */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Issues by Category</span>
          <div className="h-44 w-full text-xs">
            {loading ? (
              <div className="h-full flex flex-col justify-between py-2 animate-pulse">
                {[0.8, 0.5, 0.9, 0.4, 0.6].map((width, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full" style={{ maxWidth: `${width * 100}%` }} />
                  </div>
                ))}
              </div>
            ) : totalReports === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 italic">No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={90} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Severity Pie Chart */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-750">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Severity Distribution</span>
          <div className="h-40 w-full text-xs flex items-center justify-between">
            {loading ? (
              <div className="h-full w-full flex items-center justify-between animate-pulse">
                <div className="w-20 h-20 rounded-full border-8 border-slate-200 dark:border-slate-700 flex items-center justify-center" />
                <div className="w-1/2 space-y-3">
                  {[0.5, 0.7, 0.4].map((_width, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-8" />
                    </div>
                  ))}
                </div>
              </div>
            ) : severityChartData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-slate-400 italic">No data to display</div>
            ) : (
              <>
                <div className="h-full w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2">
                  {severityChartData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px]">{item.name}:</span>
                      <span className="text-slate-500 text-[11px] font-semibold">{item.value} ({((item.value / totalReports) * 100).toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Detail Modal Overlay (Matching list details modal) */}
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
            <div className="overflow-y-auto p-5 space-y-5 flex-1 animate-in fade-in duration-100">
              
              {/* Image Preview with Bounding Box Overlay */}
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-slate-50 flex items-center justify-center">
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
