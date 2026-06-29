import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

export function PWABadge() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto z-50 bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-white font-bold text-sm">Update Available</h3>
          <p className="text-slate-400 text-xs mt-0.5">A new version of Community Hero is ready.</p>
        </div>
        <button 
          onClick={() => setNeedRefresh(false)}
          className="text-slate-500 hover:text-slate-300 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <button
        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        onClick={() => updateServiceWorker(true)}
      >
        <RefreshCw className="w-4 h-4" />
        Update Now
      </button>
    </div>
  )
}
