/**
 * NotificationService
 * 
 * An event-driven abstraction for delivering notifications to the user.
 * Currently uses the In-App browser Notification API.
 * Designed to easily support Web Push API (Service Worker) in the future
 * without changing the consuming components.
 */

import { MockDeliveryGateway } from './MockDeliveryGateway';

export interface AppNotification {
  id: string;
  user_id: string; // citizen_id (CIT-XXXX-XXXX) or worker auth UUID
  type: 'HIGH_SEVERITY_ALERT' | 'STATUS_UPDATE' | 'WORKER_THANKED' | 'SYSTEM';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_report_id?: string;
}

export class NotificationService {
  /**
   * Request permission from the user to show notifications.
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Send a notification if permissions are granted.
   * If Web Push is added later, this is where we'd dispatch to the Service Worker.
   */
  static sendNotification(title: string, options?: NotificationOptions): void {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        // We use the Service Worker registration to show notifications if available,
        // otherwise fallback to the standard Notification constructor.
        // Using SW registration is required for notifications on Android Chrome.
        navigator.serviceWorker?.getRegistration().then((registration) => {
          if (registration && 'showNotification' in registration) {
            registration.showNotification(title, {
              icon: '/pwa-192x192.png',
              badge: '/mask-icon.svg',
              ...options,
            });
          } else {
            new Notification(title, {
              icon: '/pwa-192x192.png',
              badge: '/mask-icon.svg',
              ...options,
            });
          }
        }).catch(() => {
          new Notification(title, {
            icon: '/pwa-192x192.png',
            badge: '/mask-icon.svg',
            ...options,
          });
        });
      } catch (e) {
        console.error('Failed to show notification', e);
      }
    }
  }

  /**
   * Check if notifications are currently granted
   */
  static isGranted(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  // --- In-App Notification Engine ---

  static async getNotifications(userId: string): Promise<AppNotification[]> {
    const raw = localStorage.getItem('mock_db_notifications');
    const notifications: AppNotification[] = raw ? JSON.parse(raw) : [];
    return notifications
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const notifs = await this.getNotifications(userId);
    return notifs.filter(n => !n.is_read).length;
  }

  static async markAsRead(notificationId: string) {
    const raw = localStorage.getItem('mock_db_notifications');
    let notifications: AppNotification[] = raw ? JSON.parse(raw) : [];
    
    notifications = notifications.map(n => {
      if (n.id === notificationId) {
        return { ...n, is_read: true };
      }
      return n;
    });

    localStorage.setItem('mock_db_notifications', JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  }

  static async markAllAsRead(userId: string) {
    const raw = localStorage.getItem('mock_db_notifications');
    let notifications: AppNotification[] = raw ? JSON.parse(raw) : [];
    
    notifications = notifications.map(n => {
      if (n.user_id === userId && !n.is_read) {
        return { ...n, is_read: true };
      }
      return n;
    });

    localStorage.setItem('mock_db_notifications', JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  }

  /**
   * Core engine method to create a notification, store it, 
   * and possibly dispatch it via Mock Delivery channels.
   */
  static async createNotification(payload: Omit<AppNotification, 'id' | 'is_read' | 'created_at'>) {
    const raw = localStorage.getItem('mock_db_notifications');
    const notifications: AppNotification[] = raw ? JSON.parse(raw) : [];

    const newNotif: AppNotification = {
      ...payload,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      is_read: false,
      created_at: new Date().toISOString()
    };

    notifications.push(newNotif);
    localStorage.setItem('mock_db_notifications', JSON.stringify(notifications));

    // Emit event so the UI updates in real-time
    window.dispatchEvent(new CustomEvent('notifications-updated', { detail: newNotif }));

    // Send a real push notification if it's a citizen (workers can also get them)
    if (this.isGranted()) {
      this.sendNotification(payload.title, { body: payload.message });
    }

    // If it's a high severity alert aimed at workers, simulate Email/SMS dispatch
    if (payload.type === 'HIGH_SEVERITY_ALERT') {
      // In a real system, we'd lookup the worker's email/phone from their profile
      const workerContact = `${payload.user_id}@worker.mock.city`;
      
      MockDeliveryGateway.dispatch({
        to: workerContact,
        subject: `URGENT: ${payload.title}`,
        body: `You have been assigned an urgent task: ${payload.message}\nLogin to the dashboard immediately to resolve.`,
        channel: 'EMAIL'
      });

      MockDeliveryGateway.dispatch({
        to: '555-0199', // Mock phone number
        body: `URGENT: ${payload.title}. Check dashboard.`,
        channel: 'SMS'
      });
    }
  }
}
