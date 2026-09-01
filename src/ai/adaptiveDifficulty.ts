// ============================================
// AI Adaptive Difficulty Engine
// Adjusts game parameters based on patient
// performance, cognitive level, and trends
// ============================================

import type { DifficultyConfig, GameType, GameSession, CognitiveLevel } from '../types';
import { getDifficultyConfig, saveDifficultyConfig, getRecentSessions, getUser } from '../store/store';

// ---- Performance Analysis ----

interface PerformanceAnalysis {
  avgAccuracy: number;
  accuracyTrend: number; // positive = improving
  avgResponseTime: number;
  consistency: number; // 0-1, higher = more consistent
  engagement: number; // 0-1, based on sessions frequency
  recentSessionCount: number;
  bestGameType: GameType | null;
  worstGameType: GameType | null;
}

export function analyzePerformance(userId: string, days = 7): PerformanceAnalysis {
  const allSessions = getRecentSessions(userId, 50);
  const recentSessions = allSessions.filter(s => {
    const d = new Date(s.completedAt);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return d >= cutoff;
  });

  if (recentSessions.length === 0) {
    return {
      avgAccuracy: 0, accuracyTrend: 0, avgResponseTime: 30,
      consistency: 0, engagement: 0, recentSessionCount: 0,
      bestGameType: null, worstGameType: null,
    };
  }

  const accuracies = recentSessions.map(s => s.accuracy);
  const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

  // Trend: compare first half vs second half accuracy
  const mid = Math.floor(accuracies.length / 2);
  const firstHalf = accuracies.slice(0, mid);
  const secondHalf = accuracies.slice(mid);
  const accuracyTrend = (secondHalf.length > 0 && firstHalf.length > 0)
    ? (secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length)
      - (firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length)
    : 0;

  const avgResponseTime = recentSessions.reduce((a, s) => a + s.timeSpent, 0) / recentSessions.length;

  // Consistency: lower variance = more consistent
  const mean = avgAccuracy;
  const variance = accuracies.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / accuracies.length;
  const consistency = Math.max(0, 1 - Math.sqrt(variance) / 50);

  // Engagement: sessions per day
  const engagement = Math.min(1, recentSessions.length / (days * 2));

  // Best and worst game types
  const byGame = new Map<GameType, number[]>();
  recentSessions.forEach(s => {
    const arr = byGame.get(s.gameType) || [];
    arr.push(s.accuracy);
    byGame.set(s.gameType, arr);
  });

  let bestGameType: GameType | null = null;
  let worstGameType: GameType | null = null;
  let bestAvg = 0;
  let worstAvg = 100;
  byGame.forEach((accs, type) => {
    const avg = accs.reduce((a, b) => a + b, 0) / accs.length;
    if (avg > bestAvg) { bestAvg = avg; bestGameType = type; }
    if (avg < worstAvg) { worstAvg = avg; worstGameType = type; }
  });

  return {
    avgAccuracy, accuracyTrend, avgResponseTime,
    consistency, engagement, recentSessionCount: recentSessions.length,
    bestGameType, worstGameType,
  };
}

// ---- Difficulty Adjustment ----

interface DifficultyRecommendation {
  newLevel: number;
  reason: string;
  adjustments: {
    timeBonus: boolean;
    hintsEnabled: boolean;
    gridSize?: number;
    optionsCount?: number;
    showPreview: boolean;
    audioCues: boolean;
  };
}

export function calculateDifficulty(
  userId: string,
  gameType: GameType,
): DifficultyRecommendation {
  const config = getDifficultyConfig(userId, gameType);
  const analysis = analyzePerformance(userId);
  let level = config.currentLevel;

  // ---- Adjustment Rules ----
  let reason = 'Maintaining current level';

  // Rule 1: High accuracy + improving trend → increase
  if (analysis.avgAccuracy > 80 && analysis.accuracyTrend > 5) {
    level = Math.min(10, level + 1);
    reason = 'Excellent performance — increasing challenge';
  }
  // Rule 2: Very high accuracy → increase more
  else if (analysis.avgAccuracy > 90) {
    level = Math.min(10, level + 1);
    reason = 'Outstanding accuracy — level up!';
  }
  // Rule 3: Low accuracy → decrease
  else if (analysis.avgAccuracy < 40) {
    level = Math.max(1, level - 1);
    reason = 'Let us make it easier for you';
  }
  // Rule 4: Declining trend → decrease
  else if (analysis.accuracyTrend < -10) {
    level = Math.max(1, level - 1);
    reason = 'Adjusting to your pace';
  }
  // Rule 5: Frustrated/streak of failures
  if (config.streakWrong >= 3) {
    level = Math.max(1, level - 1);
    reason = 'Giving you a gentler challenge';
  }
  // Rule 6: Perfect streak → small increase
  if (config.streakCorrect >= 5 && level < 10) {
    level = Math.min(10, level + 1);
    reason = 'Perfect streak! Going up!';
  }

  // Cognitive level influence
  const user = getUser(userId);
  if (user?.cognitiveLevel === 'severe' && level > 3) {
    level = Math.min(level, 3);
    reason = 'Adjusted for comfort';
  } else if (user?.cognitiveLevel === 'moderate' && level > 6) {
    level = Math.min(level, 6);
    reason = 'Adjusted for comfort';
  }

  // Save updated config
  config.currentLevel = level;
  config.lastAdjusted = new Date().toISOString();
  saveDifficultyConfig(config);

  // Map level to adjustments
  const adjustments: DifficultyRecommendation['adjustments'] = {
    timeBonus: level <= 3,
    hintsEnabled: level <= 4,
    gridSize: level <= 3 ? 4 : level <= 6 ? 5 : 6,
    optionsCount: level <= 3 ? 3 : level <= 6 ? 4 : 5,
    showPreview: level <= 4,
    audioCues: level <= 5,
  };

  return { newLevel: level, reason, adjustments };
}

// ---- Update After Session ----

export function updateAfterSession(session: GameSession): void {
  const config = getDifficultyConfig(session.userId, session.gameType);

  // Update streaks
  if (session.accuracy >= 60) {
    config.streakCorrect += 1;
    config.streakWrong = 0;
  } else {
    config.streakWrong += 1;
    config.streakCorrect = 0;
  }

  // Update rolling averages
  config.recentScores = [...config.recentScores.slice(-9), session.accuracy];
  config.recentAccuracy = config.recentScores.reduce((a, b) => a + b, 0) / config.recentScores.length;
  config.avgResponseTime = (config.avgResponseTime * 0.7) + (session.timeSpent * 0.3);

  saveDifficultyConfig(config);
}

// ---- Cognitive Score Calculation ----

export function calculateCognitiveScore(userId: string): {
  memory: number;
  attention: number;
  pattern: number;
  dailyRoutine: number;
  overall: number;
  trend: 'improving' | 'stable' | 'declining';
} {
  const analysis = analyzePerformance(userId, 14);
  const sessions = getRecentSessions(userId, 30);

  const byType = (type: GameType) => {
    const filtered = sessions.filter(s => s.gameType === type);
    if (filtered.length === 0) return 50; // baseline
    return filtered.reduce((a, s) => a + s.accuracy, 0) / filtered.length;
  };

  const memory = byType('memory-match');
  const attention = byType('attention-focus');
  const pattern = byType('pattern-recognition');
  const dailyRoutine = byType('daily-routine');
  const overall = (memory + attention + pattern + dailyRoutine) / 4;

  const trend = analysis.accuracyTrend > 5 ? 'improving'
    : analysis.accuracyTrend < -5 ? 'declining' : 'stable';

  return { memory, attention, pattern, dailyRoutine, overall, trend };
}
