import React, { useEffect, useState } from 'react';
import { TelemetryService } from '../lib/TelemetryService';

export const TelemetryPanel: React.FC = () => {
  const [metrics, setMetrics] = useState({
    triage: TelemetryService.getStats('ai_triage'),
    prediction: TelemetryService.getStats('prediction'),
    dashboard: TelemetryService.getStats('dashboard'),
    copilot: TelemetryService.getStats('copilot'),
  });

  useEffect(() => {
    const handleUpdate = () => {
      setMetrics({
        triage: TelemetryService.getStats('ai_triage'),
        prediction: TelemetryService.getStats('prediction'),
        dashboard: TelemetryService.getStats('dashboard'),
        copilot: TelemetryService.getStats('copilot'),
      });
    };

    window.addEventListener('telemetry_update', handleUpdate);
    return () => window.removeEventListener('telemetry_update', handleUpdate);
  }, []);

  const MetricRow = ({ label, stats }: { label: string, stats: any }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700 text-sm">
      <span className="text-gray-300 font-medium">{label}</span>
      <div className="flex space-x-4 text-xs font-mono">
        <span className="text-gray-400">Avg: <span className="text-blue-400">{stats.avg}ms</span></span>
        <span className="text-gray-400">P95: <span className="text-purple-400">{stats.p95}ms</span></span>
        <span className="text-gray-400">Min: <span className="text-green-400">{stats.min}ms</span></span>
        <span className="text-gray-400">Max: <span className="text-red-400">{stats.max}ms</span></span>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg shadow-xl border border-gray-800">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        Live Performance Telemetry
      </h3>
      <div className="space-y-1">
        <MetricRow label="AI Triage (/api/triage)" stats={metrics.triage} />
        <MetricRow label="Prediction Engine" stats={metrics.prediction} />
        <MetricRow label="Dashboard Render" stats={metrics.dashboard} />
        <MetricRow label="Copilot Inference" stats={metrics.copilot} />
      </div>
      <div className="mt-4 text-xs text-gray-500 text-right">
        * Based on rolling 100-event window
      </div>
    </div>
  );
};
