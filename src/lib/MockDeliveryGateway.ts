/**
 * MockDeliveryGateway.ts
 * 
 * Simulates dispatching Email and SMS notifications to workers and citizens.
 * Because we cannot use third-party APIs (like Twilio or SendGrid) for Phase 6,
 * this service formats mock communications and logs them beautifully to the browser console.
 */

export type DeliveryChannel = 'EMAIL' | 'SMS' | 'PUSH';

export interface DeliveryPayload {
  to: string; // email address, phone number, or device token
  subject?: string;
  body: string;
  channel: DeliveryChannel;
}

export class MockDeliveryGateway {
  static dispatch(payload: DeliveryPayload) {
    const timestamp = new Date().toLocaleTimeString();

    if (payload.channel === 'EMAIL') {
      console.log(
        `%c[Mock Delivery] 📧 EMAIL SENT at ${timestamp}\n%cTo: ${payload.to}\nSubject: ${payload.subject}\n\n${payload.body}`,
        'color: #4f46e5; font-weight: bold; background: #e0e7ff; padding: 2px 4px; border-radius: 4px;',
        'color: inherit; font-weight: normal;'
      );
    } else if (payload.channel === 'SMS') {
      console.log(
        `%c[Mock Delivery] 📱 SMS SENT at ${timestamp}\n%cTo: ${payload.to}\n\n${payload.body}`,
        'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 2px 4px; border-radius: 4px;',
        'color: inherit; font-weight: normal;'
      );
    } else if (payload.channel === 'PUSH') {
      console.log(
        `%c[Mock Delivery] 🔔 PUSH NOTIFICATION at ${timestamp}\n%cTo: ${payload.to}\nTitle: ${payload.subject}\n\n${payload.body}`,
        'color: #e11d48; font-weight: bold; background: #ffe4e6; padding: 2px 4px; border-radius: 4px;',
        'color: inherit; font-weight: normal;'
      );
      
      // Also try to use native browser push if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.subject || 'Community Hero Alert', {
          body: payload.body,
        });
      }
    }
  }

  /**
   * Request native browser notification permissions.
   */
  static async requestPushPermission() {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
}
