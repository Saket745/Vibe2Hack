export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ReportPayload {
  id: string;
  category: string;
  location: GeoPoint;
  timestamp: string; // ISO 8601
  description: string;
  reporter_id: string;
}

export interface IncidentCluster {
  id: string;
  rootCause: string;
  reports: ReportPayload[];
  center: GeoPoint;
  severity: string;
}

export class IncidentIntelligenceEngine {
  private static readonly CLUSTER_DISTANCE_KM = 0.5; // 500 meters
  private static readonly CLUSTER_TIME_HOURS = 24; // 24 hours window

  /**
   * Calculates the Haversine distance between two points in kilometers.
   */
  static calculateDistance(p1: GeoPoint, p2: GeoPoint): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
    const dLng = (p2.lng - p1.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * (Math.PI / 180)) * Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Pipeline Step 1: Duplicate Detection
   * Exact duplicate checks based on reporter_id, category, and exact location within a short timeframe (e.g. 5 minutes).
   */
  static detectDuplicates(reports: ReportPayload[]): ReportPayload[] {
    const unique = new Map<string, ReportPayload>();
    
    for (const report of reports) {
      // Create a signature for duplicates
      const timeMs = new Date(report.timestamp).getTime();
      const timeWindow = Math.floor(timeMs / (5 * 60 * 1000)); // 5 min buckets
      const signature = `${report.reporter_id}-${report.category}-${report.location.lat}-${report.location.lng}-${timeWindow}`;
      
      if (!unique.has(signature)) {
        unique.set(signature, report);
      }
    }
    
    return Array.from(unique.values());
  }

  /**
   * Pipeline Steps 2 & 3: Spatial and Temporal Clustering
   * Groups reports that are close in space and time.
   */
  static clusterReports(reports: ReportPayload[]): IncidentCluster[] {
    const clusters: IncidentCluster[] = [];
    
    for (const report of reports) {
      const reportTime = new Date(report.timestamp).getTime();
      let matchedCluster = false;

      for (const cluster of clusters) {
        // Temporal Check
        const isRecent = cluster.reports.some(r => {
          const diffHours = Math.abs(new Date(r.timestamp).getTime() - reportTime) / (1000 * 60 * 60);
          return diffHours <= this.CLUSTER_TIME_HOURS;
        });

        if (isRecent) {
          // Spatial Check
          const dist = this.calculateDistance(report.location, cluster.center);
          if (dist <= this.CLUSTER_DISTANCE_KM) {
            cluster.reports.push(report);
            
            // Recalculate center
            cluster.center = {
              lat: cluster.reports.reduce((sum, r) => sum + r.location.lat, 0) / cluster.reports.length,
              lng: cluster.reports.reduce((sum, r) => sum + r.location.lng, 0) / cluster.reports.length
            };
            matchedCluster = true;
            break;
          }
        }
      }

      if (!matchedCluster) {
        clusters.push({
          id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          rootCause: 'Unknown',
          reports: [report],
          center: { ...report.location },
          severity: 'medium' // Default, would be escalated in next step
        });
      }
    }

    return clusters;
  }

  /**
   * Pipeline Step 4: Root-Cause Detection
   * Analyzes clusters to synthesize a logical root incident.
   */
  static detectRootCause(clusters: IncidentCluster[]): IncidentCluster[] {
    return clusters.map(cluster => {
      // Simplified deterministic logic based on volume and category matching
      if (cluster.reports.length >= 5) {
        const categories = cluster.reports.map(r => r.category);
        const hasWater = categories.some(c => c.toLowerCase().includes('water') || c.toLowerCase().includes('pipe'));
        if (hasWater) {
          cluster.rootCause = 'Potential Main Pipe Burst';
          cluster.severity = 'critical';
        } else {
          cluster.rootCause = 'Major Infrastructure Failure';
          cluster.severity = 'high';
        }
      } else if (cluster.reports.length > 1) {
        cluster.rootCause = `Multiple ${cluster.reports[0].category} Reports`;
      } else {
        cluster.rootCause = cluster.reports[0].category;
        // Keep original severity if it was set on the report (skipped for brevity)
      }
      return cluster;
    });
  }

  /**
   * Full Pipeline Execution
   */
  static processReports(rawReports: ReportPayload[]): IncidentCluster[] {
    const deduped = this.detectDuplicates(rawReports);
    const clustered = this.clusterReports(deduped);
    return this.detectRootCause(clustered);
  }
}
