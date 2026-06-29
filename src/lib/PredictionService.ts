export interface PredictionMetrics {
  riskScore: number; // 0 to 1
  trend: 'increasing' | 'stable' | 'decreasing';
  forecastVolume: number;
}

export interface WardData {
  wardId: string;
  reportCount: number;
}

export class PredictionService {
  /**
   * Deterministically calculates risk heatmaps and forecasts based on rolling windows and moving averages.
   * Does not use AI.
   * 
   * @param recentReportsCount Number of reports in the recent rolling window (e.g., last 24 hours)
   * @param historicalBaselineVolume Baseline average number of reports for the same window size
   */
  static calculateRisk(recentReportsCount: number, historicalBaselineVolume: number): PredictionMetrics {
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    
    // Threshold for trend change (e.g., 20% variance)
    const threshold = 0.2;
    
    if (recentReportsCount > historicalBaselineVolume * (1 + threshold)) {
      trend = 'increasing';
    } else if (recentReportsCount < historicalBaselineVolume * (1 - threshold)) {
      trend = 'decreasing';
    }

    // Risk score capped at 1.0
    const baselineOrOne = historicalBaselineVolume > 0 ? historicalBaselineVolume : 1;
    const riskScore = Math.min(1.0, recentReportsCount / (baselineOrOne * 2)); 

    // Forecast using a simple moving average 
    const forecastVolume = Math.round((recentReportsCount + historicalBaselineVolume) / 2);

    return {
      riskScore,
      trend,
      forecastVolume
    };
  }

  /**
   * Generates a heatmap of risk scores for multiple wards.
   */
  static generateWardHeatmap(wardStats: { wardId: string, currentVolume: number, historicalVolume: number }[]): Record<string, PredictionMetrics> {
    const heatmap: Record<string, PredictionMetrics> = {};
    for (const stat of wardStats) {
      heatmap[stat.wardId] = this.calculateRisk(stat.currentVolume, stat.historicalVolume);
    }
    return heatmap;
  }
}
