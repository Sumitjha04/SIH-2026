// ============================================
// Cognitive Gaming & Memory Assistance Platform
// Core Type Definitions
// ============================================

export type Language = 'en' | 'hi' | 'asm' | 'ben' | 'mnp' | 'kha' | 'nag' | 'mizo' | 'tri';

export interface User {
  id: string;
  name: string;
  age: number;
  photoUrl?: string;
  language: Language;
  role: 'patient' | 'caregiver' | 'admin';
  caregiverId?: string;
  createdAt: string;
  cognitiveLevel: CognitiveLevel;
  conditions: string[];
}

export type CognitiveLevel = 'mild' | 'moderate' | 'severe';

export interface GameSession {
  id: string;
  userId: string;
  gameType: GameType;
  difficulty: number; // 1-10
  score: number;
  maxScore: number;
  accuracy: number; // 0-100
  timeSpent: number; // seconds
  completedAt: string;
  hintsUsed: number;
  mood?: 'happy' | 'neutral' | 'frustrated' | 'confused';
}

export type GameType = 'memory-match' | 'pattern-recognition' | 'daily-routine' | 'attention-focus' | 'word-association' | 'color-sort';

export interface CognitiveMetrics {
  userId: string;
  date: string;
  memoryScore: number;
  attentionScore: number;
  patternScore: number;
  dailyRoutineScore: number;
  overallScore: number;
  sessionsPlayed: number;
  avgAccuracy: number;
  avgTimeSpent: number;
  difficultyLevel: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface Reminder {
  id: string;
  userId: string;
  type: 'medicine' | 'hydration' | 'activity' | 'appointment';
  title: string;
  description: string;
  time: string; // HH:mm
  days: number[]; // 0-6 (Sun-Sat)
  enabled: boolean;
  lastTriggered?: string;
  sound: boolean;
  voice: boolean;
}

export interface CaregiverAlert {
  id: string;
  caregiverId: string;
  patientId: string;
  type: 'inactivity' | 'low-score' | 'missed-reminder' | 'mood-concern' | 'streak-broken';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  read: boolean;
}

export interface DifficultyConfig {
  gameType: GameType;
  currentLevel: number;
  recentAccuracy: number;
  recentScores: number[];
  avgResponseTime: number;
  streakCorrect: number;
  streakWrong: number;
  lastAdjusted: string;
}

export interface OfflineQueueItem {
  id: string;
  action: string;
  data: unknown;
  timestamp: string;
  synced: boolean;
}

// NER Cultural Themes
export interface CulturalTheme {
  id: string;
  name: string;
  language: Language;
  elements: {
    animals: string[];
    festivals: string[];
    foods: string[];
    places: string[];
    greetings: string[];
    colors: string[];
    nature: string[];
  };
}
