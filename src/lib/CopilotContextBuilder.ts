import { ReportPayload, IncidentCluster } from './IncidentIntelligenceEngine';
import { StructuredRecommendation } from './RecommendationEngine';

export interface CopilotContext {
  activeIncidentsCount: number;
  criticalClusters: { cause: string; size: number }[];
  recentRecommendations: { priority: string; action: string }[];
  platformStatus: string;
}

export class CopilotContextBuilder {
  /**
   * Prepares, summarizes, anonymizes, and token-optimizes platform data before sending to Gemini.
   */
  static buildContext(
    reports: ReportPayload[],
    clusters: IncidentCluster[],
    recommendations: StructuredRecommendation[]
  ): string {
    
    // 1. Anonymize and Summarize Reports
    // Remove reporter_id, exact timestamps, and exact lat/lng for context optimization
    const activeIncidentsCount = reports.length;
    
    // 2. Token-Optimize Clusters
    // Only send the most severe clusters
    const criticalClusters = clusters
      .filter(c => c.severity === 'critical' || c.severity === 'high')
      .slice(0, 5) // Limit to top 5 to save tokens
      .map(c => ({
        cause: c.rootCause,
        size: c.reports.length
      }));

    // 3. Summarize Recommendations
    const recentRecommendations = recommendations
      .slice(0, 5)
      .map(r => ({
        priority: r.priority,
        action: r.suggestedActions.map(a => a.type).join(', ')
      }));

    const context: CopilotContext = {
      activeIncidentsCount,
      criticalClusters,
      recentRecommendations,
      platformStatus: criticalClusters.length > 0 ? 'Degraded' : 'Normal'
    };

    // Return as a JSON string for the prompt system instruction
    return JSON.stringify(context);
  }
}
