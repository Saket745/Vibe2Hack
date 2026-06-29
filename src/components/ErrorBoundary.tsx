import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SystemMonitoringService } from '../lib/SystemMonitoringService';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our monitoring service
    SystemMonitoringService.logError(error, `React ErrorBoundary: ${errorInfo.componentStack}`);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    // In a real app we might want to navigate home or fully reload
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Something went wrong</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
            An unexpected error occurred in the application. Our systems have logged this issue and our team has been notified.
          </p>
          
          <button 
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>

          {/* Development only error details */}
          {import.meta.env.MODE !== 'production' && this.state.error && (
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl w-full max-w-2xl text-left overflow-auto text-xs font-mono text-slate-600 dark:text-slate-400">
              <p className="font-bold mb-2 text-rose-600 dark:text-rose-400">{this.state.error.message}</p>
              <pre>{this.state.error.stack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
