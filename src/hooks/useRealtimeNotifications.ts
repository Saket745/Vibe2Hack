import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NotificationService } from '../lib/NotificationService';
import { showToast } from '../lib/toast';

export function useRealtimeNotifications() {
  const handleStatusChange = (newStatus: string, oldStatus: string, reporterId: string) => {
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

      // Create internal notification
      NotificationService.createNotification({
        user_id: reporterId || 'unknown',
        type: 'STATUS_UPDATE',
        title,
        message: body,
      });
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

          handleStatusChange(newStatus, oldStatus, reporterId);
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
        handleStatusChange(newStatus, oldStatus, reporterId);
      }
    };
    
    const handleThankCitizen = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { reporterId: eventReporterId } = customEvent.detail;
      
      if (eventReporterId === reporterId) {
        showToast('A worker thanked you for your report!', 'info');
        NotificationService.createNotification({
          user_id: reporterId,
          type: 'WORKER_THANKED',
          title: 'Civic Gratitude ❤️',
          message: 'A worker has expressed their gratitude for your contribution to the community.'
        });
      }
    };

    const handleHighSeverityAlert = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const report = customEvent.detail;

      // Check if we are logged in as a worker
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        showToast('CRITICAL: New High-Severity Incident', 'error');
        NotificationService.createNotification({
          user_id: session.user.id,
          type: 'HIGH_SEVERITY_ALERT',
          title: 'CRITICAL: High Severity Incident',
          message: `A new ${report.category?.toUpperCase() || 'EMERGENCY'} incident was reported. Immediate action required.`,
          related_report_id: report.id
        });
      }
    };

    window.addEventListener('mock-status-update', handleMockUpdate);
    window.addEventListener('mock-thank-citizen', handleThankCitizen);
    window.addEventListener('mock-high-severity-alert', handleHighSeverityAlert);

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('mock-status-update', handleMockUpdate);
      window.removeEventListener('mock-thank-citizen', handleThankCitizen);
      window.removeEventListener('mock-high-severity-alert', handleHighSeverityAlert);
    };
  }, []);
}
