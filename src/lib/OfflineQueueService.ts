export type QueueState = 'pending' | 'uploading' | 'failed';

export interface ReportPayload {
  image: string;
  mimeType: string;
  reporterId: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  client_submission_id?: string;
}

export interface OfflineReport {
  client_submission_id: string;
  payload: ReportPayload;
  state: QueueState;
  timestamp: number;
  retry_count: number;
  error_message?: string;
}

const STORAGE_KEY = 'vibe2hack_offline_queue';
const MAX_QUEUE_SIZE = 5;
const MAX_IMAGE_SIZE_CHARS = 350000; // ~250KB in base64

export const OfflineQueueService = {
  // Storage Adapter
  getQueue(): OfflineReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read offline queue from storage', e);
      return [];
    }
  },

  _saveQueue(queue: OfflineReport[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      // Dispatch custom event for UI reactivity
      window.dispatchEvent(new Event('offline-queue-updated'));
    } catch (e) {
      console.error('Failed to save offline queue to storage', e);
    }
  },

  // Queue Operations
  enqueue(payload: ReportPayload): OfflineReport {
    const queue = this.getQueue();

    if (queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(`Offline queue is full. Maximum of ${MAX_QUEUE_SIZE} reports allowed.`);
    }

    if (payload.image && payload.image.length > MAX_IMAGE_SIZE_CHARS) {
      throw new Error('Image is too large to be saved offline. Please use a smaller image.');
    }

    const client_submission_id = payload.client_submission_id || crypto.randomUUID();
    
    // Ensure payload has the submission ID for the backend
    const payloadWithId = { ...payload, client_submission_id };

    const report: OfflineReport = {
      client_submission_id,
      payload: payloadWithId,
      state: 'pending',
      timestamp: Date.now(),
      retry_count: 0
    };

    queue.push(report);
    this._saveQueue(queue);
    return report;
  },

  remove(client_submission_id: string): void {
    const queue = this.getQueue().filter(r => r.client_submission_id !== client_submission_id);
    this._saveQueue(queue);
  },

  updateState(client_submission_id: string, state: QueueState, errorMessage?: string): void {
    const queue = this.getQueue();
    const index = queue.findIndex(r => r.client_submission_id === client_submission_id);
    if (index !== -1) {
      queue[index].state = state;
      if (state === 'failed') {
        queue[index].retry_count += 1;
        if (errorMessage) queue[index].error_message = errorMessage;
      }
      this._saveQueue(queue);
    }
  },

  // Sync Process
  async sync(apiEndpoint: string = '/api/triage'): Promise<void> {
    // Only attempt sync if we believe we are online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    const queue = this.getQueue();
    // Find items that are pending, or failed but haven't exceeded retry limits
    const itemsToSync = queue.filter(r => 
      r.state === 'pending' || (r.state === 'failed' && r.retry_count < 3)
    );

    if (itemsToSync.length === 0) return;

    for (const item of itemsToSync) {
      try {
        this.updateState(item.client_submission_id, 'uploading');

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });

        if (response.ok || response.status === 409) {
          // 409 Conflict implies it was already processed (idempotency/dedupe)
          this.remove(item.client_submission_id);
        } else if (response.status === 429) {
          // Rate limit: back off and mark as failed
          this.updateState(item.client_submission_id, 'failed', 'Rate limited');
        } else {
          const errorText = await response.text();
          this.updateState(item.client_submission_id, 'failed', errorText || 'Server error');
        }
      } catch (err: any) {
        // Network failure during sync
        this.updateState(item.client_submission_id, 'failed', err.message || 'Network error');
      }
    }
  },

  // Clear all
  clear(): void {
    this._saveQueue([]);
  }
};
