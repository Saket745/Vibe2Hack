import { EventBus } from './EventBus';
import { SystemMonitoringService } from './SystemMonitoringService';

export interface Integration {
  id: string;
  name: string;
  endpoint: string;
  enabled: boolean;
  maxRetries: number;
  timeoutMs: number;
  authHeader?: string;
  authSecret?: string;
}

export interface IntegrationLog {
  id: string;
  integration_id: string;
  event: string;
  status: 'success' | 'failed' | 'pending';
  latency_ms: number;
  attempts: number;
  response_code?: number;
  response_body?: string;
  payload: any;
  timestamp: string;
}

class IntegrationServiceImpl {
  private readonly INTEGRATIONS_KEY = 'mock_db_integrations';
  private readonly LOGS_KEY = 'mock_db_integration_logs';

  constructor() {
    this.initializeData();
    // Subscribe to standardized events
    EventBus.subscribe('report.resolved', (payload) => this.handleEvent('report.resolved', payload));
    EventBus.subscribe('worker.assigned', (payload) => this.handleEvent('worker.assigned', payload));
  }

  private initializeData() {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem(this.INTEGRATIONS_KEY)) {
        const defaultIntegrations: Integration[] = [
          {
            id: 'int-311-sync',
            name: 'City 311 Legacy System',
            endpoint: 'https://mock-city-api.com/v1/311/webhooks',
            enabled: true,
            maxRetries: 3,
            timeoutMs: 5000,
            authHeader: 'Authorization',
            authSecret: 'Bearer mock-token-123'
          }
        ];
        localStorage.setItem(this.INTEGRATIONS_KEY, JSON.stringify(defaultIntegrations));
      }
      if (!localStorage.getItem(this.LOGS_KEY)) {
        localStorage.setItem(this.LOGS_KEY, JSON.stringify([]));
      }
    }
  }

  public getIntegrations(): Integration[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.INTEGRATIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  public saveIntegration(integration: Integration): void {
    const integrations = this.getIntegrations();
    const idx = integrations.findIndex(i => i.id === integration.id);
    if (idx > -1) {
      integrations[idx] = integration;
    } else {
      integrations.push(integration);
    }
    localStorage.setItem(this.INTEGRATIONS_KEY, JSON.stringify(integrations));
  }

  public toggleIntegration(id: string, enabled: boolean): void {
    const integrations = this.getIntegrations();
    const idx = integrations.findIndex(i => i.id === id);
    if (idx > -1) {
      integrations[idx].enabled = enabled;
      localStorage.setItem(this.INTEGRATIONS_KEY, JSON.stringify(integrations));
    }
  }

  public getLogs(): IntegrationLog[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.LOGS_KEY);
    return data ? JSON.parse(data) : [];
  }

  public addLog(log: Omit<IntegrationLog, 'id' | 'timestamp'>): IntegrationLog {
    const logs = this.getLogs();
    const newLog: IntegrationLog = {
      ...log,
      id: 'ilog-' + Math.random().toString(36).substring(2, 10),
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog); // prepend
    if (logs.length > 100) logs.pop(); // keep last 100
    localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs));
    return newLog;
  }

  public updateLog(id: string, updates: Partial<IntegrationLog>): void {
    const logs = this.getLogs();
    const idx = logs.findIndex(l => l.id === id);
    if (idx > -1) {
      logs[idx] = { ...logs[idx], ...updates };
      localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs));
    }
  }

  private async handleEvent(eventName: string, payload: any) {
    const integrations = this.getIntegrations().filter(i => i.enabled);
    for (const integration of integrations) {
      await this.deliverWebhook(integration, eventName, payload);
    }
  }

  /**
   * Mock implementation of asynchronous webhook delivery with retry policy
   */
  public async deliverWebhook(integration: Integration, eventName: string, payload: any, attempt = 1, existingLogId?: string): Promise<void> {
    const startTime = performance.now();
    
    // Create initial pending log
    let logId = existingLogId;
    if (!logId) {
      const log = this.addLog({
        integration_id: integration.id,
        event: eventName,
        status: 'pending',
        latency_ms: 0,
        attempts: attempt,
        payload
      });
      logId = log.id;
    } else {
      this.updateLog(logId, { status: 'pending', attempts: attempt });
    }

    try {
      // Simulate network request (using random delay 200-800ms)
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));

      // Simulate 20% random failure rate for demo purposes
      if (Math.random() > 0.8) {
        throw new Error('Simulated network timeout');
      }

      // Success
      const latency = performance.now() - startTime;
      this.updateLog(logId, {
        status: 'success',
        latency_ms: Math.round(latency),
        response_code: 200,
        response_body: JSON.stringify({ success: true, message: 'Webhook received' })
      });

    } catch (error: any) {
      const latency = performance.now() - startTime;
      
      // Retry policy
      if (attempt < integration.maxRetries) {
        this.updateLog(logId, {
          status: 'pending',
          latency_ms: Math.round(latency),
          response_code: 504,
          response_body: error.message
        });
        
        // Exponential backoff mock (wait 1s, then 2s)
        const backoff = 1000 * attempt;
        setTimeout(() => {
          this.deliverWebhook(integration, eventName, payload, attempt + 1, logId);
        }, backoff);
      } else {
        // Exhausted retries
        this.updateLog(logId, {
          status: 'failed',
          latency_ms: Math.round(latency),
          response_code: 500,
          response_body: `Failed after ${attempt} attempts: ${error.message}`
        });
        
        // Also log to SystemMonitoringService as a critical failure
        SystemMonitoringService.logError(new Error(`Integration Delivery Failed: ${integration.name}`), 'IntegrationService');
      }
    }
  }

  /**
   * Admin Tool: Manually test a connection
   */
  public async testConnection(integrationId: string): Promise<boolean> {
    const integration = this.getIntegrations().find(i => i.id === integrationId);
    if (!integration) return false;
    
    // Simulate ping
    await new Promise(resolve => setTimeout(resolve, 500));
    return true; // We always return true for the demo test connection
  }
}

export const IntegrationService = new IntegrationServiceImpl();
