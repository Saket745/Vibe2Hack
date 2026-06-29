import { EventBus } from './EventBus';

export interface RuleCondition {
  field: string; // e.g. 'report.severity', 'cluster.reports.length'
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface RuleAction {
  type: 'notify' | 'escalate' | 'webhook';
  payload: any;
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  eventTrigger: string; // e.g., 'REPORT_CREATED', 'CLUSTER_DETECTED'
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export class RuleEngine {
  private rules: Rule[] = [];

  constructor() {
    this.loadRules();
  }

  /**
   * Loads rules from configurable data (localStorage for now, simulating DB).
   */
  public loadRules(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app_rules');
      if (stored) {
        this.rules = JSON.parse(stored);
      } else {
        // Default rule for Demo
        this.rules = [
          {
            id: 'rule-critical-alert',
            name: 'Alert on Critical Incident',
            enabled: true,
            eventTrigger: 'CLUSTER_DETECTED',
            conditions: [
              {
                field: 'cluster.severity',
                operator: 'equals',
                value: 'critical'
              }
            ],
            actions: [
              {
                type: 'notify',
                payload: { message: 'Critical Incident Detected. Immediate attention required.' }
              }
            ]
          }
        ];
        this.saveRules();
      }
    }
  }

  public saveRules(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_rules', JSON.stringify(this.rules));
    }
  }

  public getRules(): Rule[] {
    return this.rules;
  }

  /**
   * Subscribes to the EventBus to evaluate rules when events are triggered.
   */
  public subscribeToEvents(eventBus: typeof EventBus): void {
    eventBus.subscribe('REPORT_CREATED', (data) => this.evaluateRules('REPORT_CREATED', { report: data }));
    eventBus.subscribe('CLUSTER_DETECTED', (data) => this.evaluateRules('CLUSTER_DETECTED', { cluster: data }));
  }

  /**
   * Evaluates rules for a given event and executes actions if conditions are met.
   */
  private evaluateRules(eventTrigger: string, contextData: any): void {
    const activeRules = this.rules.filter(r => r.enabled && r.eventTrigger === eventTrigger);

    for (const rule of activeRules) {
      if (this.checkConditions(rule.conditions, contextData)) {
        this.executeActions(rule.actions, contextData);
      }
    }
  }

  private checkConditions(conditions: RuleCondition[], contextData: any): boolean {
    // Basic AND evaluation for all conditions
    for (const condition of conditions) {
      const actualValue = this.resolveField(condition.field, contextData);
      
      switch (condition.operator) {
        case 'equals':
          if (actualValue !== condition.value) return false;
          break;
        case 'greater_than':
          if (actualValue <= condition.value) return false;
          break;
        case 'less_than':
          if (actualValue >= condition.value) return false;
          break;
        case 'contains':
          if (!Array.isArray(actualValue) || !actualValue.includes(condition.value)) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  }

  private resolveField(path: string, obj: any): any {
    return path.split('.').reduce((prev, curr) => {
      return prev ? prev[curr] : undefined;
    }, obj);
  }

  private executeActions(actions: RuleAction[], contextData: any): void {
    for (const action of actions) {
      if (action.type === 'notify') {
        console.log(`[RuleEngine] Dispatching Notification:`, action.payload.message);
        // Integrate with NotificationService
        EventBus.publish('NOTIFICATION_REQUESTED', action.payload);
      } else if (action.type === 'escalate') {
        console.log(`[RuleEngine] Escalating incident`);
      } else if (action.type === 'webhook') {
        console.log(`[RuleEngine] Triggering webhook`, action.payload);
      }
    }
  }
}

export const ruleEngineInstance = new RuleEngine();
