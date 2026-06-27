import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NotificationService } from '../lib/NotificationService';
import { showToast } from '../lib/toast';

export function useRealtimeNotifications() {
  const handleStatusChange = (newStatus: string, oldStatus: string) => {
    // Only trigger if the status actually changed
    if (newStatus !== oldStatus) {
      let title = 'Report Update';
      let body = `Your report status changed to ${newStatus}`;

      if (newStatus === 'resolved') {
        title = 'Issue Resolved! 🎉';
        body = 'A ward worker has resolved your reported issue. Tap to view details and leave feedback.';
      } else if (newStatus === 'in_progress') {
        title = 'Issue In Progress 🛠️';
        body = 'A ward worker is currently investigating your report.';
      } else if (newStatus === 'rejected') {
        title = 'Issue Closed';
        body = 'Your report was closed by a ward worker.';
      }

      // Always show the in-app toast
      showToast(title, 'info');

      // Trigger the native browser notification if permissions were granted
      NotificationService.sendNotification(title, {
        body,
        vibrate: [200, 100, 200],
      } as NotificationOptions & { vibrate?: number[] });
    }
  };

  useEffect(() => {
    // 1. Get or generate the anonymous reporter ID
    let reporterId = localStorage.getItem('reporter_id');
    if (!reporterId) {
      reporterId = 'f' + (Math.random().toString(36).substring(2, 17) + Math.random().toString(36).substring(2, 17)).substring(0, 35);
      localStorage.setItem('reporter_id', reporterId);
    }

    // 2. Request notification permissions (silently asks the browser, user may accept/deny)
    // In a production app, we might want a UI button to trigger this so the browser doesn't block it.
    // For now, we'll request it when the app loads if it hasn't been denied.
    if (Notification.permission !== 'denied' && Notification.permission !== 'granted') {
      NotificationService.requestPermission();
    }

    // 3. Subscribe to Realtime updates for this specific reporter's issues
    const channel = supabase
      .channel(`public:reports:reporter_id=eq.${reporterId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: `reporter_id=eq.${reporterId}`,
        },
        (payload: any) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;

          handleStatusChange(newStatus, oldStatus);
        }
      )
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          console.log('🔔 Realtime Notifications Active for ID:', reporterId);
        }
      });

    // 4. Also listen for local mock events (for when running without a Supabase backend)
    const handleMockUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { newStatus, oldStatus, reporterId: eventReporterId } = customEvent.detail;
      
      // Only process if it belongs to this local anonymous reporter
      if (eventReporterId === reporterId) {
        handleStatusChange(newStatus, oldStatus);
      }
    };
    
    window.addEventListener('mock-status-update', handleMockUpdate);

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('mock-status-update', handleMockUpdate);
    };
  }, []);
}
