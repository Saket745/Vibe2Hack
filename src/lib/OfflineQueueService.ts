import localforage from 'localforage';
import { supabase } from './supabaseClient';

export type QueueState = 'pending' | 'uploading' | 'failed';

export interface ReportPayload {
  image?: string;
  mimeType: string;
  reporterId: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  client_submission_id?: string;
  tempStoragePath?: string;
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
const MAX_QUEUE_SIZE = 50; // Increased to 50 since IndexedDB has much higher limits

export const OfflineQueueService = {
  // Storage Adapter
  async getQueue(): Promise<OfflineReport[]> {
    try {
      const data = await localforage.getItem<OfflineReport[]>(STORAGE_KEY);
      return data || [];
    } catch (e) {
      console.error('Failed to read offline queue from localforage', e);
      return [];
    }
  },

  async _saveQueue(queue: OfflineReport[]): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEY, queue);
      // Dispatch custom event for UI reactivity
      window.dispatchEvent(new Event('offline-queue-updated'));
    } catch (e) {
      console.error('Failed to save offline queue to localforage', e);
    }
  },

  // Queue Operations
  async enqueue(payload: ReportPayload): Promise<OfflineReport> {
    const queue = await this.getQueue();

    if (queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(`Offline queue is full. Maximum of ${MAX_QUEUE_SIZE} reports allowed.`);
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
    await this._saveQueue(queue);
    return report;
  },

  async remove(client_submission_id: string): Promise<void> {
    const queue = await this.getQueue();
    const updatedQueue = queue.filter(r => r.client_submission_id !== client_submission_id);
    await this._saveQueue(updatedQueue);
  },

  async updateState(client_submission_id: string, state: QueueState, errorMessage?: string): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex(r => r.client_submission_id === client_submission_id);
    if (index !== -1) {
      queue[index].state = state;
      if (state === 'failed') {
        queue[index].retry_count += 1;
        if (errorMessage) queue[index].error_message = errorMessage;
      }
      await this._saveQueue(queue);
    }
  },

  // Sync Process
  async sync(): Promise<void> {
    // Only attempt sync if we believe we are online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    const queue = await this.getQueue();
    
    // Find all pending or failed items that haven't maxed out retries
    const itemsToSync = queue.filter(
      r => (r.state === 'pending' || r.state === 'failed') && r.retry_count < 3
    );

    if (itemsToSync.length === 0) return;

    for (const report of itemsToSync) {
      try {
        await this.updateState(report.client_submission_id, 'uploading');
        
        let payload = { ...report.payload };

        // If the payload still has raw base64 image (was queued offline directly),
        // we must upload it to Supabase storage first!
        if (payload.image && !payload.tempStoragePath) {
          const base64Data = payload.image;
          const mimeType = payload.mimeType || 'image/jpeg';
          
          // Convert base64 to Blob
          const resBlob = await fetch(base64Data);
          const blob = await resBlob.blob();

          const fileExt = mimeType.split('/')[1] || 'jpg';
          const tempStoragePath = `temp/${report.client_submission_id}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('report-photos')
            .upload(tempStoragePath, blob, { 
              contentType: mimeType,
              upsert: true
            });

          if (uploadError) {
             throw new Error(`Storage Upload Failed during sync: ${uploadError.message}`);
          }

          // Swap base64 image for the storage path
          payload.tempStoragePath = tempStoragePath;
          delete payload.image;
        }

        const { error: insertError } = await supabase.from('reports').insert({
          reporter_id: payload.reporterId,
          image_url: payload.tempStoragePath,
          description: payload.description || '',
          latitude: payload.latitude,
          longitude: payload.longitude,
          status: 'pending_triage',
          category: 'unknown',
          severity: 'unknown',
          dedupe_hash: `client_id_${report.client_submission_id}`
        });

        if (!insertError) {
          // Success! Remove from offline queue
          await this.remove(report.client_submission_id);
          console.log(`[Offline Sync] Successfully uploaded report ${report.client_submission_id}`);
        } else if (insertError.code === '23505') {
          // 409 Conflict means duplicate dedupe_hash. We can safely remove it.
          await this.remove(report.client_submission_id);
          console.log(`[Offline Sync] Removed duplicate report ${report.client_submission_id}`);
        } else {
          // Server error, keep in queue and mark failed
          await this.updateState(report.client_submission_id, 'failed', insertError.message || 'Server error during sync');
        }
      } catch (err: any) {
        // Network error, keep in queue
        await this.updateState(report.client_submission_id, 'failed', err.message || 'Network error');
      }
    }
  },

  // Clear all
  async clear(): Promise<void> {
    await this._saveQueue([]);
  }
};
