// ============================================
// LocalStorage-based Data Store
// Supports offline-first architecture
// ============================================

import { v4 as uuidv4 } from 'uuid';
import type {
  User, GameSession, CognitiveMetrics, Reminder,
  CaregiverAlert, DifficultyConfig, GameType, OfflineQueueItem
} from '../types';

const STORAGE_PREFIX = 'cogassist_';

function getStore<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setStore<T>(key: string, value: T): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

// ---- Users ----
export function getUsers(): User[] {
  return getStore<User[]>('users') || [];
}

export function getUser(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  setStore('users', users);
}

export function getPatients(caregiverId?: string): User[] {
  const users = getUsers().filter(u => u.role === 'patient');
  return caregiverId ? users.filter(u => u.caregiverId === caregiverId) : users;
}

// ---- Game Sessions ----
export function getGameSessions(userId: string, gameType?: GameType): GameSession[] {
  const all = getStore<GameSession[]>('sessions') || [];
  return all.filter(s => s.userId === userId && (!gameType || s.gameType === gameType));
}

export function saveGameSession(session: GameSession): void {
  const sessions = getStore<GameSession[]>('sessions') || [];
  sessions.push(session);
  setStore('sessions', sessions);
}

export function getRecentSessions(userId: string, count = 10): GameSession[] {
  return getGameSessions(userId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, count);
}

// ---- Cognitive Metrics ----
export function getCognitiveMetrics(userId: string, days = 30): CognitiveMetrics[] {
  const all = getStore<CognitiveMetrics[]>('metrics') || [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return all.filter(m => m.userId === userId && new Date(m.date) >= cutoff);
}

export function saveCognitiveMetrics(metrics: CognitiveMetrics): void {
  const all = getStore<CognitiveMetrics[]>('metrics') || [];
  const idx = all.findIndex(m => m.userId === metrics.userId && m.date === metrics.date);
  if (idx >= 0) all[idx] = metrics;
  else all.push(metrics);
  setStore('metrics', all);
}

// ---- Difficulty Config ----
export function getDifficultyConfig(userId: string, gameType: GameType): DifficultyConfig {
  const all = getStore<DifficultyConfig[]>('difficulty') || [];
  const existing = all.find(d => d.userId === userId && d.gameType === gameType);
  if (existing) return existing;

  // Default config based on user's cognitive level
  const user = getUser(userId);
  const startLevel = user?.cognitiveLevel === 'severe' ? 1
    : user?.cognitiveLevel === 'moderate' ? 3 : 5;

  return {
    userId,
    gameType,
    currentLevel: startLevel,
    recentAccuracy: 0,
    recentScores: [],
    avgResponseTime: 0,
    streakCorrect: 0,
    streakWrong: 0,
    lastAdjusted: new Date().toISOString(),
  };
}

export function saveDifficultyConfig(config: DifficultyConfig): void {
  const all = getStore<DifficultyConfig[]>('difficulty') || [];
  const idx = all.findIndex(d => d.userId === config.userId && d.gameType === config.gameType);
  if (idx >= 0) all[idx] = config;
  else all.push(config);
  setStore('difficulty', all);
}

// ---- Reminders ----
export function getReminders(userId: string): Reminder[] {
  const all = getStore<Reminder[]>('reminders') || [];
  return all.filter(r => r.userId === userId);
}

export function saveReminder(reminder: Reminder): void {
  const all = getStore<Reminder[]>('reminders') || [];
  const idx = all.findIndex(r => r.id === reminder.id);
  if (idx >= 0) all[idx] = reminder;
  else all.push(reminder);
  setStore('reminders', all);
}

export function deleteReminder(id: string): void {
  const all = getStore<Reminder[]>('reminders') || [];
  setStore('reminders', all.filter(r => r.id !== id));
}

// ---- Alerts ----
export function getAlerts(caregiverId: string): CaregiverAlert[] {
  const all = getStore<CaregiverAlert[]>('alerts') || [];
  return all.filter(a => a.caregiverId === caregiverId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveAlert(alert: CaregiverAlert): void {
  const all = getStore<CaregiverAlert[]>('alerts') || [];
  all.push(alert);
  setStore('alerts', all);
}

export function markAlertRead(id: string): void {
  const all = getStore<CaregiverAlert[]>('alerts') || [];
  const alert = all.find(a => a.id === id);
  if (alert) {
    alert.read = true;
    setStore('alerts', all);
  }
}

// ---- Offline Queue ----
export function addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'synced'>): void {
  const queue = getStore<OfflineQueueItem[]>('offline_queue') || [];
  queue.push({ ...item, id: uuidv4(), synced: false });
  setStore('offline_queue', queue);
}

export function getUnsyncedItems(): OfflineQueueItem[] {
  return (getStore<OfflineQueueItem[]>('offline_queue') || []).filter(i => !i.synced);
}

export function markSynced(ids: string[]): void {
  const queue = getStore<OfflineQueueItem[]>('offline_queue') || [];
  ids.forEach(id => {
    const item = queue.find(i => i.id === id);
    if (item) item.synced = true;
  });
  setStore('offline_queue', queue);
}

// ---- Demo Data ----
export function initializeDemoData(): void {
  if (getUsers().length > 0) return;

  // Create demo patient
  const patient: User = {
    id: 'patient-1',
    name: 'Dai Aunto',
    age: 72,
    language: 'en',
    role: 'patient',
    caregiverId: 'caregiver-1',
    createdAt: new Date().toISOString(),
    cognitiveLevel: 'mild',
    conditions: ['Mild Dementia', 'Memory Loss'],
  };

  const caregiver: User = {
    id: 'caregiver-1',
    name: 'Rina Gogoi',
    age: 35,
    language: 'en',
    role: 'caregiver',
    createdAt: new Date().toISOString(),
    cognitiveLevel: 'mild',
    conditions: [],
  };

  saveUser(patient);
  saveUser(caregiver);

  // Create demo reminders
  const reminders: Reminder[] = [
    {
      id: 'rem-1', userId: 'patient-1', type: 'medicine',
      title: 'Morning Medicine', description: 'Take blood pressure tablet with warm water',
      time: '08:00', days: [0,1,2,3,4,5,6], enabled: true, sound: true, voice: true,
    },
    {
      id: 'rem-2', userId: 'patient-1', type: 'hydration',
      title: 'Drink Water', description: 'Time to drink a glass of water',
      time: '10:00', days: [0,1,2,3,4,5,6], enabled: true, sound: true, voice: true,
    },
    {
      id: 'rem-3', userId: 'patient-1', type: 'activity',
      title: 'Morning Walk', description: 'Take a gentle walk in the garden',
      time: '06:30', days: [1,2,3,4,5], enabled: true, sound: true, voice: true,
    },
    {
      id: 'rem-4', userId: 'patient-1', type: 'appointment',
      title: 'Doctor Visit', description: 'Monthly check-up at health centre',
      time: '10:00', days: [3], enabled: true, sound: true, voice: true,
    },
  ];
  reminders.forEach(saveReminder);

  // Create demo game sessions for past week
  const gameTypes: GameType[] = ['memory-match', 'pattern-recognition', 'daily-routine', 'attention-focus'];
  const now = Date.now();
  for (let day = 7; day >= 0; day--) {
    const sessionsCount = 1 + Math.floor(Math.random() * 3);
    for (let s = 0; s < sessionsCount; s++) {
      const gameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
      const difficulty = Math.min(10, Math.max(1, 3 + Math.floor((7 - day) / 3)));
      const accuracy = Math.min(100, Math.max(30, 50 + day * 3 + Math.floor(Math.random() * 20)));
      const maxScore = difficulty * 10;
      const score = Math.floor(maxScore * accuracy / 100);

      const session: GameSession = {
        id: `session-${day}-${s}`,
        userId: 'patient-1',
        gameType,
        difficulty,
        score,
        maxScore,
        accuracy,
        timeSpent: 120 + Math.floor(Math.random() * 300),
        completedAt: new Date(now - day * 86400000 - s * 3600000).toISOString(),
        hintsUsed: Math.floor(Math.random() * 3),
        mood: ['happy', 'neutral', 'happy'][Math.floor(Math.random() * 3)] as 'happy' | 'neutral',
      };
      saveGameSession(session);
    }
  }

  // Save initial difficulty configs
  gameTypes.forEach(gt => {
    const config = getDifficultyConfig('patient-1', gt);
    config.currentLevel = 3 + Math.floor(Math.random() * 3);
    config.recentAccuracy = 55 + Math.floor(Math.random() * 20);
    saveDifficultyConfig(config);
  });
}
