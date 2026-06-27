/**
 * NotificationService
 * 
 * An event-driven abstraction for delivering notifications to the user.
 * Currently uses the In-App browser Notification API.
 * Designed to easily support Web Push API (Service Worker) in the future
 * without changing the consuming components.
 */

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
}
