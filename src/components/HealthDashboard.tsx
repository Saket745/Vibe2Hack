import React, { useState, useEffect } from 'react';
import { TelemetryPanel } from './TelemetryPanel';

export const HealthDashboard: React.FC = () => {
  const [health, setHealth] = useState({
    supabase: 'checking',
    gemini: 'checking',
    storage: 'checking',
    offlineQueue: 0,
    chaosMode: {
      dbTimeout: false,
      geminiTimeout: false,
      offline: false
    }
  });

  // Simple mock check for demo purposes
  useEffect(() => {
    setTimeout(() => {
      setHealth(prev => ({
        ...prev,
        supabase: prev.chaosMode.dbTimeout ? 'error' : 'ok',
        gemini: prev.chaosMode.geminiTimeout ? 'error' : 'ok',
        storage: 'ok',
        offlineQueue: prev.chaosMode.offline ? 3 : 0
      }));
    }, 1000);
  }, [health.chaosMode]);

  const toggleChaos = (key: keyof typeof health.chaosMode) => {
    setHealth(prev => ({
      ...prev,
      chaosMode: { ...prev.chaosMode, [key]: !prev.chaosMode[key] },
      [key === 'dbTimeout' ? 'supabase' : key === 'geminiTimeout' ? 'gemini' : 'storage']: 'checking'
    }));
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'checking') return <span className="text-yellow-400 animate-pulse">●</span>;
    if (status === 'ok') return <span className="text-green-500">✓</span>;
    return <span className="text-red-500">✗</span>;
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">System Health & Diagnostics</h1>
            <p className="text-gray-400 mt-1">Real-time status, telemetry, and chaos engineering</p>
          </div>
          <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
            Return to App
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-800 pb-2">Subsystem Status</h2>
            <ul className="space-y-3">
              <li className="flex justify-between items-center text-gray-300">
                <span>Supabase (PostgreSQL)</span>
                <StatusIcon status={health.supabase} />
              </li>
              <li className="flex justify-between items-center text-gray-300">
                <span>Gemini API (GenAI)</span>
                <StatusIcon status={health.gemini} />
              </li>
              <li className="flex justify-between items-center text-gray-300">
                <span>Object Storage</span>
                <StatusIcon status={health.storage} />
              </li>
              <li className="flex justify-between items-center text-gray-300 border-t border-gray-800 pt-3 mt-3">
                <span>Offline Sync Queue</span>
                <span className={`font-mono ${health.offlineQueue > 0 ? 'text-yellow-400' : 'text-green-500'}`}>
                  {health.offlineQueue} items
                </span>
              </li>
            </ul>
          </div>

          {/* Telemetry Panel */}
          <TelemetryPanel />
        </div>

        {/* Chaos Engineering Panel */}
        <div className="bg-gray-900 border border-red-900/50 rounded-lg p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
          <h2 className="text-xl font-semibold text-white mb-2 text-red-400">Chaos Testing Controls</h2>
          <p className="text-gray-400 text-sm mb-6">Toggle these switches during the demo to prove graceful degradation.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
              onClick={() => toggleChaos('dbTimeout')}
              className={`p-3 rounded-md text-sm font-medium transition-all ${health.chaosMode.dbTimeout ? 'bg-red-600 text-white border-red-500' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700'} border`}
            >
              Simulate DB Timeout
            </button>
            <button 
              onClick={() => toggleChaos('geminiTimeout')}
              className={`p-3 rounded-md text-sm font-medium transition-all ${health.chaosMode.geminiTimeout ? 'bg-red-600 text-white border-red-500' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700'} border`}
            >
              Simulate AI Failure
            </button>
            <button 
              onClick={() => toggleChaos('offline')}
              className={`p-3 rounded-md text-sm font-medium transition-all ${health.chaosMode.offline ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700'} border`}
            >
              Force Offline Mode
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
