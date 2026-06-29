export interface ApiMetric {
  id: string;
  endpoint: string;
  method: string;
  durationMs: number;
  success: boolean;
  timestamp: string;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  context?: string;
  timestamp: string;
}

const METRICS_KEY = 'mock_db_system_metrics';
const ERRORS_KEY = 'mock_db_system_errors';

export class SystemMonitoringService {
  private static generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  static logApiRequest(endpoint: string, method: string, durationMs: number, success: boolean = true) {
    const metric: ApiMetric = {
      id: this.generateId(),
      endpoint,
      method,
      durationMs,
      success,
      timestamp: new Date().toISOString()
    };

    const metrics = this.getMetrics();
    // Keep only last 500 metrics to avoid local storage bloat
    const updatedMetrics = [metric, ...metrics].slice(0, 500);
    localStorage.setItem(METRICS_KEY, JSON.stringify(updatedMetrics));
  }

  static logError(error: Error, context?: string) {
    const log: ErrorLog = {
      id: this.generateId(),
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    const errors = this.getErrors();
    const updatedErrors = [log, ...errors].slice(0, 100);
    localStorage.setItem(ERRORS_KEY, JSON.stringify(updatedErrors));
    
    // Also log to console in development
    console.error(`[SystemMonitor] ${context ? `[${context}] ` : ''}${error.message}`, error);
  }

  static getMetrics(): ApiMetric[] {
    try {
      const stored = localStorage.getItem(METRICS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static getErrors(): ErrorLog[] {
    try {
      const stored = localStorage.getItem(ERRORS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static clearLogs() {
    localStorage.removeItem(METRICS_KEY);
    localStorage.removeItem(ERRORS_KEY);
  }
}
