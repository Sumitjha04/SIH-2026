// ============================================
// Caregiver Monitoring Dashboard
// Cognitive analytics, charts, alerts
// ============================================

import { useMemo } from 'react';
import { useApp } from '../App';
import {
  getUser, getRecentSessions, getCognitiveMetrics, getAlerts,
  getReminders, saveAlert,
} from '../store/store';
import { analyzePerformance, calculateCognitiveScore } from '../ai/adaptiveDifficulty';
import { t } from '../i18n/languages';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { GameType, CaregiverAlert } from '../types';
import { v4 as uuidv4 } from 'uuid';

const GAME_LABELS: Record<GameType, string> = {
  'memory-match': 'Memory Match',
  'pattern-recognition': 'Pattern Recognition',
  'daily-routine': 'Daily Routine',
  'attention-focus': 'Attention Focus',
  'word-association': 'Word Association',
  'color-sort': 'Color Sort',
};

const GAME_ICONS: Record<GameType, string> = {
  'memory-match': '🃏',
  'pattern-recognition': '🔍',
  'daily-routine': '📋',
  'attention-focus': '👁️',
  'word-association': '💬',
  'color-sort': '🎨',
};

export default function Dashboard() {
  const { language, currentUserId } = useApp();
  const patient = getUser(currentUserId);
  const sessions = getRecentSessions(currentUserId, 100);
  const performance = analyzePerformance(currentUserId, 14);
  const cognitiveScore = calculateCognitiveScore(currentUserId);
  const reminders = getReminders(currentUserId);

  // Generate weekly data for chart
  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const daySessions = sessions.filter(s => s.completedAt.startsWith(dateStr));
      const avgAccuracy = daySessions.length > 0
        ? daySessions.reduce((a, s) => a + s.accuracy, 0) / daySessions.length
        : 0;
      days.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        accuracy: Math.round(avgAccuracy),
        sessions: daySessions.length,
        score: daySessions.reduce((a, s) => a + s.score, 0),
      });
    }
    return days;
  }, [sessions]);

  // Game performance data
  const gamePerformance = useMemo(() => {
    const byType = new Map<GameType, number[]>();
    sessions.forEach(s => {
      const arr = byType.get(s.gameType) || [];
      arr.push(s.accuracy);
      byType.set(s.gameType, arr);
    });
    return Array.from(byType.entries()).map(([type, accs]) => ({
      game: GAME_LABELS[type],
      icon: GAME_ICONS[type],
      avgAccuracy: Math.round(accs.reduce((a, b) => a + b, 0) / accs.length),
      sessions: accs.length,
    }));
  }, [sessions]);

  // Radar chart data
  const radarData = [
    { subject: 'Memory', value: Math.round(cognitiveScore.memory) },
    { subject: 'Attention', value: Math.round(cognitiveScore.attention) },
    { subject: 'Pattern', value: Math.round(cognitiveScore.pattern) },
    { subject: 'Routine', value: Math.round(cognitiveScore.dailyRoutine) },
  ];

  // Daily session timeline
  const timelineData = useMemo(() => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6am-8pm
    return hours.map(h => {
      const count = sessions.filter(s => {
        const hour = new Date(s.completedAt).getHours();
        return hour === h;
      }).length;
      return { hour: `${h}:00`, sessions: count };
    });
  }, [sessions]);

  // Recent activity for last 7 days
  const recentSessions = sessions.slice(0, 20);
  const totalSessionsToday = sessions.filter(s =>
    s.completedAt.startsWith(new Date().toISOString().split('T')[0])
  ).length;

  const trendEmoji = cognitiveScore.trend === 'improving' ? '📈' :
    cognitiveScore.trend === 'declining' ? '📉' : '➡️';

  return (
    <div>
      <div className="page-header">
        <h2>📊 {t(language, 'dashboard')}</h2>
        <p>{patient?.name}'s cognitive health overview</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card">
          <div className="stat-icon">🧠</div>
          <div className="stat-value">{Math.round(cognitiveScore.overall)}</div>
          <div className="stat-label">{t(language, 'cognitiveScore')}</div>
          <div className={`stat-trend ${cognitiveScore.trend === 'improving' ? 'up' : cognitiveScore.trend === 'declining' ? 'down' : 'neutral'}`}>
            {t(language, cognitiveScore.trend)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">{t(language, 'sessionsPlayed')}</div>
          <div className="stat-trend neutral">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{totalSessionsToday}</div>
          <div className="stat-label">Today's Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-value">{reminders.filter(r => r.enabled).length}</div>
          <div className="stat-label">Active Reminders</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Weekly Progress */}
        <div className="chart-container">
          <h3>📈 {t(language, 'weeklyProgress')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="day" fontSize={14} tick={{ fill: '#5D4037' }} />
              <YAxis fontSize={14} tick={{ fill: '#5D4037' }} />
              <Tooltip
                contentStyle={{ fontSize: 14, borderRadius: 12 }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#2E7D32"
                strokeWidth={3}
                dot={{ r: 5, fill: '#2E7D32' }}
                name="Accuracy %"
              />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#FF8F00"
                strokeWidth={2}
                dot={{ r: 4, fill: '#FF8F00' }}
                name="Sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cognitive Radar */}
        <div className="chart-container">
          <h3>🧠 {t(language, 'cognitiveScore')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E0E0E0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 14, fill: '#5D4037' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#2E7D32"
                fill="#4CAF50"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Game Performance */}
      <div className="chart-container" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3>🎮 {t(language, 'gamePerformance')}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={gamePerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="game" fontSize={13} tick={{ fill: '#5D4037' }} />
            <YAxis domain={[0, 100]} fontSize={13} tick={{ fill: '#5D4037' }} />
            <Tooltip contentStyle={{ fontSize: 14, borderRadius: 12 }} />
            <Bar dataKey="avgAccuracy" fill="#2E7D32" radius={[6, 6, 0, 0]} name="Avg Accuracy %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Timeline */}
      <div className="chart-container" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3>⏰ Activity Timeline (Today)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="hour" fontSize={12} tick={{ fill: '#5D4037' }} />
            <YAxis fontSize={12} tick={{ fill: '#5D4037' }} />
            <Tooltip contentStyle={{ fontSize: 13, borderRadius: 12 }} />
            <Bar dataKey="sessions" fill="#FF8F00" radius={[4, 4, 0, 0]} name="Sessions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Score Cards */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        {[
          { label: t(language, 'memoryScore'), value: cognitiveScore.memory, icon: '🧩', color: '#2E7D32' },
          { label: t(language, 'attentionScore'), value: cognitiveScore.attention, icon: '👁️', color: '#1565C0' },
          { label: t(language, 'patternScore'), value: cognitiveScore.pattern, icon: '🔍', color: '#6A1B9A' },
          { label: 'Routine Score', value: cognitiveScore.dailyRoutine, icon: '📋', color: '#E65100' },
        ].map(item => (
          <div key={item.label} className="stat-card">
            <div className="stat-icon">{item.icon}</div>
            <div className="stat-value" style={{ color: item.color }}>{Math.round(item.value)}</div>
            <div className="stat-label">{item.label}</div>
            <div className="game-progress-bar" style={{ marginTop: 'var(--space-sm)' }}>
              <div className="fill" style={{ width: `${item.value}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Performance Insights */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-lg)' }}>
          💡 AI Performance Insights
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: '#E8F5E9',
            fontSize: 'var(--font-sm)',
          }}>
            <strong>Average Accuracy:</strong> {Math.round(performance.avgAccuracy)}%
            {performance.accuracyTrend > 0
              ? ` (↑ Improving by ${Math.round(performance.accuracyTrend)}% per period)`
              : performance.accuracyTrend < 0
                ? ` (↓ Declining by ${Math.abs(Math.round(performance.accuracyTrend))}% per period)`
                : ' (→ Stable)'
            }
          </div>
          <div style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: '#E3F2FD',
            fontSize: 'var(--font-sm)',
          }}>
            <strong>Consistency:</strong> {Math.round(performance.consistency * 100)}%
            — {performance.consistency > 0.7 ? 'Very consistent performance!' : 'Performance varies across sessions.'}
          </div>
          <div style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: '#FFF3E0',
            fontSize: 'var(--font-sm)',
          }}>
            <strong>Engagement:</strong> {Math.round(performance.engagement * 100)}%
            — {performance.engagement > 0.5 ? 'Great engagement level!' : 'Could benefit from more daily sessions.'}
          </div>
          {performance.bestGameType && (
            <div style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: '#F3E5F5',
              fontSize: 'var(--font-sm)',
            }}>
              <strong>Strongest Area:</strong> {GAME_ICONS[performance.bestGameType]} {GAME_LABELS[performance.bestGameType]}
              {performance.worstGameType && (
                <> | <strong>Needs Focus:</strong> {GAME_ICONS[performance.worstGameType]} {GAME_LABELS[performance.worstGameType]}</>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="card">
        <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-lg)' }}>
          📝 {t(language, 'activityLog')}
        </h3>
        {recentSessions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No recent activity</p>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {recentSessions.map((session, i) => (
              <div key={session.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-md) 0',
                borderBottom: i < recentSessions.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}>
                <span style={{ fontSize: 28 }}>{GAME_ICONS[session.gameType]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>
                    {GAME_LABELS[session.gameType]}
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    Level {session.difficulty} • {new Date(session.completedAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontWeight: 700,
                    color: session.accuracy >= 70 ? 'var(--success)' : session.accuracy >= 40 ? 'var(--warning)' : 'var(--danger)',
                    fontSize: 'var(--font-base)',
                  }}>
                    {Math.round(session.accuracy)}%
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    {session.score}/{session.maxScore}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
