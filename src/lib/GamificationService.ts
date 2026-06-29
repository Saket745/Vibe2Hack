export const GamificationConfig = {
  points: {
    submitReport: 10,
    reportResolved: 20,
    thankedByWorker: 15
  },
  levels: [
    { name: 'Bronze Citizen', minPoints: 0 },
    { name: 'Silver Citizen', minPoints: 100 },
    { name: 'Gold Citizen', minPoints: 300 },
    { name: 'Civic Hero', minPoints: 500 }
  ]
};

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export const GamificationService = {
  calculateScore(reports: any[]): number {
    let score = 0;
    reports.forEach(report => {
      score += GamificationConfig.points.submitReport;
      if (report.status === 'resolved') {
        score += GamificationConfig.points.reportResolved;
      }
      if (report.worker_thanked_at) {
        score += GamificationConfig.points.thankedByWorker;
      }
    });
    return score;
  },

  getLevel(score: number) {
    let currentLevel = GamificationConfig.levels[0];
    for (const level of GamificationConfig.levels) {
      if (score >= level.minPoints) {
        currentLevel = level;
      }
    }
    return currentLevel;
  },

  getAchievements(reports: any[]): Achievement[] {
    const achievements: Achievement[] = [];
    if (reports.length > 0) {
      achievements.push({ id: 'first_report', title: 'First Step', description: 'Submitted your first civic issue.', icon: 'Flag', unlockedAt: reports[0]?.created_at });
    }
    const resolved = reports.filter(r => r.status === 'resolved');
    if (resolved.length > 0) {
      achievements.push({ id: 'first_resolve', title: 'Problem Solved', description: 'One of your reports was resolved!', icon: 'CheckCircle', unlockedAt: resolved[0]?.resolved_at || new Date().toISOString() });
    }
    const thanked = reports.filter(r => r.worker_thanked_at);
    if (thanked.length > 0) {
      achievements.push({ id: 'thanked', title: 'Civic Gratitude', description: 'Received a Thank You from a ward worker.', icon: 'Heart', unlockedAt: thanked[0]?.worker_thanked_at });
    }
    return achievements;
  }
};