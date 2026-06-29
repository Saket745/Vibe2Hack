type MetricName = 'ai_triage' | 'prediction' | 'dashboard' | 'notification' | 'integration' | 'copilot';

interface MetricSnapshot {
  value: number;
  timestamp: number;
}

class TelemetryServiceImpl {
  private metrics: Record<MetricName, MetricSnapshot[]> = {
    ai_triage: [],
    prediction: [],
    dashboard: [],
    notification: [],
    integration: [],
    copilot: []
  };

  private readonly MAX_HISTORY = 100;

  public record(name: MetricName, valueMs: number) {
    this.metrics[name].push({ value: valueMs, timestamp: Date.now() });
    
    // Keep rolling window
    if (this.metrics[name].length > this.MAX_HISTORY) {
      this.metrics[name].shift();
    }
    
    // Dispatch event so UI can update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telemetry_update'));
    }
  }

  public getStats(name: MetricName) {
    const data = this.metrics[name].map(m => m.value);
    if (data.length === 0) return { avg: 0, p95: 0, min: 0, max: 0, count: 0 };

    data.sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    const min = data[0];
    const max = data[data.length - 1];
    
    const p95Index = Math.floor(data.length * 0.95);
    const p95 = data[p95Index];

    return {
      avg: Math.round(avg),
      p95: Math.round(p95),
      min: Math.round(min),
      max: Math.round(max),
      count: data.length
    };
  }

  // Helper for wrapping an async function to measure its execution time
  public async measure<T>(name: MetricName, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.record(name, duration);
    }
  }
}

export const TelemetryService = new TelemetryServiceImpl();
