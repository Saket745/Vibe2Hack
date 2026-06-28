import { useState, useEffect } from 'react';
import ReportScreen from './components/ReportScreen';
import ReportsList from './components/ReportsList';
import DashboardScreen from './components/DashboardScreen';
import WorkerScreen from './components/WorkerScreen';
import CitizenProfile from './components/CitizenProfile';
import NotificationCenter from './components/NotificationCenter';
import { Camera, Map, BarChart2, CheckCircle, AlertTriangle, Info, X, Users, Award } from 'lucide-react';
import { PWABadge } from './components/PWABadge';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';

interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  useRealtimeNotifications();
  
  const [activeTab, setActiveTab] = useState<'report' | 'explore' | 'profile' | 'dashboard' | 'worker'>('report');
  const [toast, setToast] = useState<ToastData | null>(null);

  // Listen for global custom toast events
  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastData>;
      setToast(customEvent.detail);
    };
    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 relative">
      {/* Premium Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 flex justify-between items-center max-w-md mx-auto rounded-b-3xl shadow-sm">
        <span className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
          <span className="p-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs">
            CH
          </span>
          Community Hero
        </span>
        
        <div className="flex items-center gap-2">
          <NotificationCenter />
          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/20">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'report'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Report
          </button>
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'explore'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            Explore
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('worker')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'worker'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Workers
          </button>
        </div>
      </div>
    </header>

      {/* Screen Render */}
      <div className="mt-2">
        {activeTab === 'report' ? (
          <ReportScreen />
        ) : activeTab === 'explore' ? (
          <ReportsList />
        ) : activeTab === 'profile' ? (
          <CitizenProfile />
        ) : activeTab === 'dashboard' ? (
          <DashboardScreen />
        ) : (
          <WorkerScreen />
        )}
      </div>

      {/* Global Floating Toast Component */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm w-[90%] md:w-auto bg-white dark:bg-slate-800 ${
          toast.type === 'success' 
            ? 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : toast.type === 'error'
            ? 'border-rose-500/20 text-rose-600 dark:text-rose-450'
            : 'border-blue-500/20 text-blue-600 dark:text-blue-400'
        }`}>
          <div className={`p-1.5 rounded-xl shrink-0 ${
            toast.type === 'success' 
              ? 'bg-emerald-500/10' 
              : toast.type === 'error' 
              ? 'bg-rose-500/10' 
              : 'bg-blue-500/10'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs font-bold leading-relaxed">{toast.message}</span>
          <button 
            onClick={() => setToast(null)} 
            className="ml-auto p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <PWABadge />
    </div>
  );
}

export default App;
