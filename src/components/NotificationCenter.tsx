import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Heart, Info, CheckCheck } from 'lucide-react';
import { NotificationService } from '../lib/NotificationService';
import type { AppNotification } from '../lib/NotificationService';
import { supabase } from '../lib/supabaseClient';
import { useCitizenId } from '../hooks/useCitizenId';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  const { citizenId } = useCitizenId();

  // Load the current identity (worker or citizen)
  useEffect(() => {
    const fetchIdentity = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      } else {
        setUserId(citizenId);
      }
    };
    fetchIdentity();
  }, [citizenId]);

  // Load notifications and listen for updates
  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      const notifs = await NotificationService.getNotifications(userId);
      setNotifications(notifs);
    };

    loadNotifications();

    const handleUpdate = () => loadNotifications();
    window.addEventListener('notifications-updated', handleUpdate);

    // Also poll every 15 seconds as a fallback
    const interval = setInterval(loadNotifications, 15000);

    return () => {
      window.removeEventListener('notifications-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await NotificationService.markAllAsRead(userId);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await NotificationService.markAsRead(notif.id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'HIGH_SEVERITY_ALERT': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'STATUS_UPDATE': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'WORKER_THANKED': return <Heart className="w-5 h-5 text-pink-500" />;
      default: return <Info className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-slate-900" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer ${notif.is_read ? 'opacity-60' : 'bg-indigo-50/30 dark:bg-indigo-900/10'}`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">{notif.title}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{notif.message}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium uppercase tracking-widest">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 self-center" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
