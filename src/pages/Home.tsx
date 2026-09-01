// ============================================
// Home Page — Patient Welcome Screen
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { getUser, getReminders, getRecentSessions } from '../store/store';
import { calculateCognitiveScore } from '../ai/adaptiveDifficulty';
import { speak } from '../voice/voiceAssistant';
import { t } from '../i18n/languages';
import type { GameType, GameSession } from '../types';

export default function Home() {
  const { language, currentUserId, voiceEnabled } = useApp();
  const navigate = useNavigate();
  const user = getUser(currentUserId);
  const [greeting, setGreeting] = useState('');

  const reminders = getReminders(currentUserId);
  const activeReminders = reminders.filter(r => r.enabled);
  const recentSessions = getRecentSessions(currentUserId, 5);
  const cognitiveScore = calculateCognitiveScore(currentUserId);

  // Time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Voice greeting
  useEffect(() => {
    if (voiceEnabled && user) {
      const timer = setTimeout(() => {
        speak(`${greeting}, ${user.name}! Welcome to Freebuff.`, language);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [greeting, voiceEnabled]);

  const quickGames: { type: GameType; icon: string; label: string; desc: string }[] = [
    { type: 'memory-match', icon: '🃏', label: t(language, 'memoryMatch'), desc: t(language, 'memoryMatchDesc') },
    { type: 'pattern-recognition', icon: '🔍', label: t(language, 'patternRecognition'), desc: t(language, 'patternRecognitionDesc') },
    { type: 'daily-routine', icon: '📋', label: t(language, 'dailyRoutine'), desc: t(language, 'dailyRoutineDesc') },
    { type: 'attention-focus', icon: '👁️', label: t(language, 'attentionFocus'), desc: t(language, 'attentionFocusDesc') },
  ];

  const gameRoutes: Record<GameType, string> = {
    'memory-match': '/games/memory-match',
    'pattern-recognition': '/games/pattern-recognition',
    'daily-routine': '/games/daily-routine',
    'attention-focus': '/games/attention-focus',
    'word-association': '/games/memory-match',
    'color-sort': '/games/memory-match',
  };

  const trendEmoji = cognitiveScore.trend === 'improving' ? '📈' :
    cognitiveScore.trend === 'declining' ? '📉' : '➡️';

  return (
    <div>
      {/* Welcome Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1B5E20, #2E7D32, #43A047)',
        color: 'white',
        marginBottom: 'var(--space-xl)',
        padding: 'var(--space-xl) var(--space-xl)',
      }}>
        <h2 style={{ fontSize: 'var(--font-2xl)', marginBottom: 'var(--space-sm)' }}>
          🙏 {greeting}, {user?.name || 'Friend'}!
        </h2>
        <p style={{ fontSize: 'var(--font-lg)', opacity: 0.9 }}>
          Welcome to Freebuff — your cognitive wellness companion
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-xl)', marginTop: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>
              {Math.round(cognitiveScore.overall)}
            </div>
            <div style={{ fontSize: 'var(--font-sm)', opacity: 0.8 }}>{t(language, 'cognitiveScore')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>
              {recentSessions.length}
            </div>
            <div style={{ fontSize: 'var(--font-sm)', opacity: 0.8 }}>{t(language, 'sessionsPlayed')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>
              {t(language, cognitiveScore.trend)}
            </div>
            <div style={{ fontSize: 'var(--font-sm)', opacity: 0.8 }}>{t(language, 'trend')}</div>
          </div>
        </div>
      </div>

      {/* Quick Games */}
      <div className="page-header">
        <h2>🎮 {t(language, 'games')}</h2>
        <p>Choose a game to exercise your mind</p>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {quickGames.map(game => (
          <div
            key={game.type}
            className="game-card card-clickable"
            onClick={() => navigate(gameRoutes[game.type])}
            role="button"
            tabIndex={0}
            aria-label={`Play ${game.label}`}
          >
            <span className="game-icon">{game.icon}</span>
            <h3>{game.label}</h3>
            <p>{game.desc}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Reminders */}
      <div className="page-header">
        <h2>⏰ {t(language, 'reminders')}</h2>
      </div>

      {activeReminders.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          {activeReminders.slice(0, 3).map(reminder => {
            const iconMap = { medicine: '💊', hydration: '💧', activity: '🚶', appointment: '🏥' };
            return (
              <div key={reminder.id} className="reminder-card">
                <div className={`reminder-icon ${reminder.type}`}>
                  {iconMap[reminder.type]}
                </div>
                <div className="reminder-info">
                  <h4>{reminder.title}</h4>
                  <p>{reminder.description}</p>
                </div>
                <div className="reminder-time">{reminder.time}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          <p style={{ fontSize: 'var(--font-lg)', color: 'var(--text-muted)' }}>
            {t(language, 'noReminders')}
          </p>
        </div>
      )}

      {/* Recent Activity */}
      {recentSessions.length > 0 && (
        <>
          <div className="page-header">
            <h2>📝 Recent Activity</h2>
          </div>
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            {recentSessions.map((session: GameSession, i: number) => {
              const gameName = quickGames.find(g => g.type === session.gameType)?.label || session.gameType;
              const gameIcon = quickGames.find(g => g.type === session.gameType)?.icon || '🎮';
              const date = new Date(session.completedAt);
              const timeAgo = getTimeAgo(date);
              return (
                <div key={session.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md) 0',
                  borderBottom: i < recentSessions.length - 1 ? '1px solid var(--border-light)' : 'none',
                }}>
                  <span style={{ fontSize: '28px' }}>{gameIcon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{gameName}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{timeAgo}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: session.accuracy >= 60 ? 'var(--success)' : 'var(--warning)' }}>
                      {Math.round(session.accuracy)}%
                    </div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                      {session.score}/{session.maxScore}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Cognitive Score Breakdown */}
      <div className="page-header">
        <h2>🧠 {t(language, 'cognitiveScore')}</h2>
      </div>
      <div className="grid grid-4">
        {[
          { label: t(language, 'memoryScore'), value: cognitiveScore.memory, icon: '🧩' },
          { label: t(language, 'attentionScore'), value: cognitiveScore.attention, icon: '👁️' },
          { label: t(language, 'patternScore'), value: cognitiveScore.pattern, icon: '🔍' },
          { label: t(language, 'dailyRoutineScore' as any), value: cognitiveScore.dailyRoutine, icon: '📋' },
        ].map(item => (
          <div key={item.label} className="stat-card">
            <div className="stat-icon">{item.icon}</div>
            <div className="stat-value">{Math.round(item.value)}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}
