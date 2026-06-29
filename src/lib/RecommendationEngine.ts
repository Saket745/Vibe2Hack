import { IncidentCluster } from './IncidentIntelligenceEngine';

export interface RecommendationAction {
  type: 'REALLOCATE_WORKERS' | 'ESCALATE_ISSUE' | 'DISPATCH_EMERGENCY' | 'SCHEDULE_MAINTENANCE' | 'INFORM_PUBLIC';
  targetId?: string; // Ward ID, Worker ID, etc.
  description: string;
}

export interface StructuredRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0 to 1
  suggestedActions: RecommendationAction[];
  reasoning: string;
}

export class RecommendationEngine {
  /**
   * Generates actionable recommendations based on incident clusters and active worker constraints.
   */
  static generateRecommendations(
    clusters: IncidentCluster[],
    availableWorkers: { wardId: string; count: number }[]
  ): StructuredRecommendation[] {
    const recommendations: StructuredRecommendation[] = [];

    for (const cluster of clusters) {
      if (cluster.severity === 'critical') {
        const action: RecommendationAction = {
          type: 'DISPATCH_EMERGENCY',
          description: `Dispatch emergency team to address ${cluster.rootCause} near lat: ${cluster.center.lat.toFixed(4)}, lng: ${cluster.center.lng.toFixed(4)}`
        };

        recommendations.push({
          id: `rec-${Date.now()}-${cluster.id}`,
          priority: 'critical',
          confidence: 0.95,
          suggestedActions: [action, { type: 'INFORM_PUBLIC', description: 'Issue alert to local residents' }],
          reasoning: `Cluster identified as critical: ${cluster.rootCause} with ${cluster.reports.length} reports.`
        });
      } else if (cluster.severity === 'high') {
        recommendations.push({
          id: `rec-${Date.now()}-${cluster.id}`,
          priority: 'high',
          confidence: 0.85,
          suggestedActions: [{
            type: 'ESCALATE_ISSUE',
            description: `Escalate ${cluster.rootCause} for immediate review.`
          }],
          reasoning: `High severity cluster detected with ${cluster.reports.length} reports.`
        });
      }
    }

    // Worker Reallocation Recommendation
    const busyWards = clusters.length; // simplified logic
    if (busyWards > availableWorkers.reduce((acc, w) => acc + w.count, 0)) {
      recommendations.push({
        id: `rec-worker-realloc-${Date.now()}`,
        priority: 'medium',
        confidence: 0.70,
        suggestedActions: [{
          type: 'REALLOCATE_WORKERS',
          description: 'Reallocate workers from low-activity wards to high-activity wards'
        }],
        reasoning: 'Incident volume exceeds available worker capacity in current distribution.'
      });
    }

    // Sort by priority
    const priorityWeights = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    return recommendations.sort((a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]);
  }
}
