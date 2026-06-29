import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AuthorizationService, type UserProfile, type AuditLog } from '../lib/AuthorizationService';
import { SystemMonitoringService, type ApiMetric, type ErrorLog } from '../lib/SystemMonitoringService';
import { LocationService, type City } from '../lib/LocationService';
import { IntegrationService, type Integration, type IntegrationLog } from '../lib/IntegrationService';
import { showToast } from '../lib/toast';
import { Shield, ShieldAlert, Users, LayoutDashboard, Activity, BarChart, Settings, UserCheck, Map as MapIcon, Server, AlertTriangle, MapPin, Zap } from 'lucide-react';
import { CopilotWidget } from './CopilotWidget';

export default function AdminScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workers' | 'cities' | 'integrations' | 'system'>('dashboard');
  
  const [metrics, setMetrics] = useState<ApiMetric[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [cities, setCities] = useState<City[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>([]);
  
  useEffect(() => {
    const checkAccess = async () => {
      const admin = await AuthorizationService.isAdmin();
      setIsAdmin(admin);
      if (admin) {
        fetchWorkers();
        refreshSystemLogs();
        setAuditLogs(AuthorizationService.getAuditLogs());
        setCities(LocationService.getCities());
        setIntegrations(IntegrationService.getIntegrations());
        setIntegrationLogs(IntegrationService.getLogs());
      }
      setLoading(false);
    };
    checkAccess();
    
    // Refresh logs periodically if on system or integrations tab
    const interval = setInterval(() => {
      if (activeTab === 'system') refreshSystemLogs();
      if (activeTab === 'integrations') setIntegrationLogs(IntegrationService.getLogs());
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const refreshSystemLogs = () => {
    setMetrics(SystemMonitoringService.getMetrics());
    setErrors(SystemMonitoringService.getErrors());
  };

  const fetchWorkers = async () => {
    const { data, error } = await supabase.from('worker_profiles').select('*');
    if (!error && data) {
      setWorkers(data as UserProfile[]);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'worker' | 'admin') => {
    const currentUser = await AuthorizationService.getCurrentUserProfile();
    if (!currentUser) return;

    const { error } = await supabase
      .from('worker_profiles')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (error) {
      showToast('Failed to change role', 'error');
      return;
    }

    await AuthorizationService.logAdminAction(currentUser.id, 'CHANGE_ROLE', userId, { newRole });
    showToast(`Role updated to ${newRole}`, 'success');
    fetchWorkers();
  };

  const handleWardReassign = async (userId: string, currentWards: number[]) => {
    const currentUser = await AuthorizationService.getCurrentUserProfile();
    if (!currentUser) return;

    const newWards = currentWards.includes(1) ? [2] : [1];

    const { error } = await supabase
      .from('worker_profiles')
      .update({ ward_ids: newWards })
      .eq('id', userId);

    if (error) {
      showToast('Failed to reassign ward', 'error');
      return;
    }

    await AuthorizationService.logAdminAction(currentUser.id, 'REASSIGN_WARD', userId, { oldWards: currentWards, newWards });
    showToast(`Reassigned to Ward(s) ${newWards.join(',')}`, 'success');
    fetchWorkers();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Access Denied</h2>
        <p className="mt-2 text-sm">You do not have administrative privileges to view this area.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-6 px-4 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Shield className="w-6 h-6 text-purple-600" />
          City Administrator Panel
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${activeTab === 'dashboard' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Activity className="w-4 h-4" />
            Executive KPIs
          </button>
          <button 
            onClick={() => setActiveTab('workers')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${activeTab === 'workers' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
          <button 
            onClick={() => setActiveTab('cities')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${activeTab === 'cities' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <MapPin className="w-4 h-4" />
            Cities
          </button>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${activeTab === 'integrations' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Zap className="w-4 h-4" />
            Integrations
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${activeTab === 'system' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Server className="w-4 h-4" />
            System Health
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><LayoutDashboard className="w-3 h-3"/> Active Wards</div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">12</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><UserCheck className="w-3 h-3"/> SLA Compliance</div>
              <div className="text-2xl font-black text-emerald-600">94%</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Avg Resolution</div>
              <div className="text-2xl font-black text-indigo-600">1.2 days</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><BarChart className="w-3 h-3"/> Platform Load</div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">Moderate</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">Ward Performance (Simulated)</h3>
            <div className="h-48 flex items-end gap-2 mt-4">
              {[80, 45, 90, 60, 30].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-t-lg relative group">
                  <div 
                    className="absolute bottom-0 w-full bg-indigo-500 dark:bg-indigo-600 rounded-t-lg transition-all duration-700"
                    style={{ height: `${h}%` }}
                  ></div>
                  <div className="absolute -bottom-6 left-0 w-full text-center text-xs text-slate-500 font-bold">W{i+1}</div>
                </div>
              ))}
            </div>
          </div>

          <CopilotWidget />
        </div>
      ) : activeTab === 'workers' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Worker Profiles</h3>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
              {workers.length} Users
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">User ID</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Assigned Wards</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {workers.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">{w.email || w.id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${w.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {w.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{w.ward_ids.join(', ') || 'None'}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button 
                        onClick={() => handleRoleChange(w.id, w.role === 'admin' ? 'worker' : 'admin')}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                        title="Toggle Role"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleWardReassign(w.id, w.ward_ids)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                        title="Reassign Ward"
                      >
                        <MapIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'cities' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Cities Configuration</h3>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-3 font-semibold rounded-tl-xl">ID</th>
                  <th className="p-3 font-semibold">City Name</th>
                  <th className="p-3 font-semibold">State/Region</th>
                  <th className="p-3 font-semibold rounded-tr-xl">Country</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {cities.map((city) => (
                  <tr key={city.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{city.id}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{city.name}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{city.state}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{city.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'integrations' ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Integration Registry */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Integration Registry</h3>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-3 font-semibold rounded-tl-xl">Name</th>
                    <th className="p-3 font-semibold">Endpoint</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Retry Policy</th>
                    <th className="p-3 font-semibold rounded-tr-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {integrations.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{i.name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{i.endpoint}</td>
                      <td className="p-3">
                        <button 
                          onClick={() => {
                            IntegrationService.toggleIntegration(i.id, !i.enabled);
                            setIntegrations(IntegrationService.getIntegrations());
                          }}
                          className={`px-2 py-1 rounded-md text-xs font-bold ${i.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                        >
                          {i.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">Up to {i.maxRetries}x</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={async () => {
                            const ok = await IntegrationService.testConnection(i.id);
                            alert(ok ? 'Connection successful!' : 'Connection failed!');
                          }}
                          className="text-blue-500 hover:text-blue-600 text-xs font-semibold px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                        >
                          Test Ping
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery Logs */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" />
                Webhook Delivery Logs
              </h3>
              <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-lg">
                {integrationLogs.length} Events
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-3 font-semibold pl-4">Timestamp</th>
                    <th className="p-3 font-semibold">Event</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Attempt</th>
                    <th className="p-3 font-semibold text-right pr-4">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {integrationLogs.slice(0, 15).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-3 pl-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {log.event}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          log.status === 'failed' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {log.status}
                        </span>
                        {log.response_code && (
                          <span className="ml-2 text-xs text-slate-400">HTTP {log.response_code}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {log.attempts}
                      </td>
                      <td className="p-3 pr-4 text-right text-slate-600 dark:text-slate-400 font-mono">
                        {log.latency_ms}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Server className="w-3 h-3"/> Total Requests</div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{metrics.length}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Avg Latency</div>
              <div className="text-2xl font-black text-emerald-600">
                {metrics.length > 0 ? `${Math.round(metrics.reduce((acc, curr) => acc + curr.durationMs, 0) / metrics.length)} ms` : 'N/A'}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Exceptions Logged</div>
              <div className="text-2xl font-black text-rose-600">{errors.length}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Error Logs
              </h3>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Context</th>
                    <th className="px-4 py-3 font-semibold">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {errors.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No errors logged recently</td></tr>
                  ) : (
                    errors.map(err => (
                      <tr key={err.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{new Date(err.timestamp).toLocaleTimeString()}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{err.context || 'Unknown'}</td>
                        <td className="px-4 py-3 text-xs text-rose-600 dark:text-rose-400 truncate max-w-xs" title={err.message}>{err.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" />
                API Request Log
              </h3>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Endpoint</th>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {metrics.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No requests logged recently</td></tr>
                  ) : (
                    metrics.slice(0, 50).map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{new Date(m.timestamp).toLocaleTimeString()}</td>
                        <td className="px-4 py-3 text-xs font-bold text-indigo-600 dark:text-indigo-400">{m.method}</td>
                        <td className="px-4 py-3 font-mono text-xs truncate max-w-[150px]" title={m.endpoint}>{m.endpoint}</td>
                        <td className="px-4 py-3 text-xs">{m.durationMs}ms</td>
                        <td className="px-4 py-3">
                          {m.success ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Success"></span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" title="Failed"></span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
