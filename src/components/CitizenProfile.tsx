import React, { useState, useEffect } from 'react';
import { Award, Star, CheckCircle, Heart, Flag, Copy, RefreshCw, Key, Shield } from 'lucide-react';
import { useCitizenId } from '../hooks/useCitizenId';
import { GamificationService, GamificationConfig } from '../lib/GamificationService';
import { supabase } from '../lib/supabaseClient';
import { showToast } from '../lib/toast';

export default function CitizenProfile() {
  const { citizenId, restoreCitizenId } = useCitizenId();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreInput, setRestoreInput] = useState('');
  const [showRestore, setShowRestore] = useState(false);

  useEffect(() => {
    if (!citizenId) return;
    const fetchReports = async () => {
      setLoading(true);
      const { data } = await supabase.from('reports').select('*').eq('reporter_id', citizenId);
      if (data) setReports(data);
      setLoading(false);
    };
    fetchReports();
  }, [citizenId]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(citizenId);
    showToast('Citizen ID copied to clipboard!', 'success');
  };

  const handleRestore = () => {
    if (restoreCitizenId(restoreInput.trim())) {
      showToast('Identity restored successfully!', 'success');
      setShowRestore(false);
    } else {
      showToast('Invalid ID format. Must start with CIT-', 'error');
    }
  };

  const score = GamificationService.calculateScore(reports);
  const level = GamificationService.getLevel(score);
  const achievements = GamificationService.getAchievements(reports);

  return (
    <div className="max-w-md mx-auto space-y-4 px-4 pt-4">
      {/* Identity Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 text-white shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-100 mb-1">Anonymous Identity</h2>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-200" />
              <span className="text-2xl font-black tracking-tight">{citizenId}</span>
            </div>
          </div>
          <button onClick={handleCopyId} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        
        {!showRestore ? (
          <button onClick={() => setShowRestore(true)} className="flex items-center gap-2 text-xs font-semibold text-indigo-100 hover:text-white transition-colors">
            <RefreshCw className="w-3 h-3" /> Restore existing ID
          </button>
        ) : (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
            <input 
              type="text" 
              placeholder="CIT-XXXX-XXXX" 
              value={restoreInput}
              onChange={e => setRestoreInput(e.target.value.toUpperCase())}
              className="flex-1 bg-black/20 border border-white/20 rounded-xl px-3 py-1.5 text-sm font-bold text-white placeholder:text-white/40 focus:outline-none focus:border-white/50" 
            />
            <button onClick={handleRestore} className="bg-white text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-indigo-50">Apply</button>
            <button onClick={() => setShowRestore(false)} className="bg-black/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-black/30">Cancel</button>
          </div>
        )}
      </div>

      {/* Score Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Civic Score</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-slate-800 dark:text-white leading-none">{score}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">pts</span>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mb-2 shadow-inner">
              <Award className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{level.name}</p>
          </div>
        </div>
      </div>

      {/* Achievements List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" /> Recent Achievements
        </h3>
        <div className="space-y-3">
          {achievements.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Submit your first report to start earning achievements!</p>
          ) : achievements.map(ach => (
            <div key={ach.id} className="flex gap-3 items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                {ach.icon === 'Heart' ? <Heart className="w-5 h-5" /> : ach.icon === 'CheckCircle' ? <CheckCircle className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{ach.title}</p>
                <p className="text-xs text-slate-500">{ach.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}