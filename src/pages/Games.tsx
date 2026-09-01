// ============================================
// Games Overview Page
// ============================================

import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { getDifficultyConfig } from '../store/store';
import { t } from '../i18n/languages';
import type { GameType } from '../types';

const games: { type: GameType; icon: string; labelKey: string; descKey: string; route: string }[] = [
  { type: 'memory-match', icon: '🃏', labelKey: 'memoryMatch', descKey: 'memoryMatchDesc', route: '/games/memory-match' },
  { type: 'pattern-recognition', icon: '🔍', labelKey: 'patternRecognition', descKey: 'patternRecognitionDesc', route: '/games/pattern-recognition' },
  { type: 'daily-routine', icon: '📋', labelKey: 'dailyRoutine', descKey: 'dailyRoutineDesc', route: '/games/daily-routine' },
  { type: 'attention-focus', icon: '👁️', labelKey: 'attentionFocus', descKey: 'attentionFocusDesc', route: '/games/attention-focus' },
];

export default function Games() {
  const { language, currentUserId } = useApp();
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h2>🎮 {t(language, 'games')}</h2>
        <p>Choose a cognitive game to play</p>
      </div>

      <div className="grid grid-2">
        {games.map(game => {
          const config = getDifficultyConfig(currentUserId, game.type);
          return (
            <div
              key={game.type}
              className="game-card card-clickable"
              onClick={() => navigate(game.route)}
              role="button"
              tabIndex={0}
              aria-label={`Play ${t(language, game.labelKey as any)}`}
            >
              <span className="game-icon">{game.icon}</span>
              <h3>{t(language, game.labelKey as any)}</h3>
              <p>{t(language, game.descKey as any)}</p>
              <div className="game-level">
                ⚡ {t(language, 'level')} {config.currentLevel}/10
              </div>
            </div>
          );
        })}
      </div>

      {/* Voice Game Mode — Special Feature */}
      <div
        className="game-card card-clickable"
        onClick={() => navigate('/games/voice')}
        role="button"
        tabIndex={0}
        style={{
          marginTop: 'var(--space-xl)',
          background: 'linear-gradient(135deg, #E8F5E9, #FFF3E0)',
          border: '3px solid var(--primary-light)',
        }}
      >
        <span className="game-icon">🗣️</span>
        <h3 style={{ fontSize: 'var(--font-xl)' }}>Voice Game Mode</h3>
        <p style={{ fontSize: 'var(--font-base)' }}>
          Play any game entirely by speaking — no tapping needed!
        </p>
        <div style={{
          marginTop: 'var(--space-md)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--primary)',
          color: 'white',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--font-sm)',
          fontWeight: 600,
        }}>
          🎤 Tap to Start Voice Mode
        </div>
      </div>

      {/* Game Descriptions */}
      <div style={{ marginTop: 'var(--space-xl)' }}>
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>
            🧩 {t(language, 'memoryMatch')}
          </h3>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            {t(language, 'memoryInstruction')}
          </p>
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>
            🔍 {t(language, 'patternRecognition')}
          </h3>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            {t(language, 'patternInstruction')}
          </p>
        </div>
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>
            📋 {t(language, 'dailyRoutine')}
          </h3>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            {t(language, 'dailyRoutineInstruction')}
          </p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-sm)' }}>
            👁️ {t(language, 'attentionFocus')}
          </h3>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            {t(language, 'attentionInstruction')}
          </p>
        </div>
      </div>
    </div>
  );
}
