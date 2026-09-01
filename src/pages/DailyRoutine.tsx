// ============================================
// Daily Routine Recall Game
// Put daily activities in the correct order
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../App';
import { calculateDifficulty, updateAfterSession } from '../ai/adaptiveDifficulty';
import { saveGameSession } from '../store/store';
import { speakGamePhrase } from '../voice/voiceAssistant';
import { t } from '../i18n/languages';
import type { GameSession } from '../types';

interface RoutineActivity {
  id: string;
  emoji: string;
  label: string;
  order: number;
}

const ROUTINE_SETS: RoutineActivity[][] = [
  [
    { id: 'a1', emoji: '🌅', label: 'Wake Up', order: 1 },
    { id: 'a2', emoji: '🪥', label: 'Brush Teeth', order: 2 },
    { id: 'a3', emoji: '🚿', label: 'Take Bath', order: 3 },
    { id: 'a4', emoji: '☕', label: 'Morning Tea', order: 4 },
    { id: 'a5', emoji: '🍳', label: 'Breakfast', order: 5 },
    { id: 'a6', emoji: '🚶', label: 'Morning Walk', order: 6 },
    { id: 'a7', emoji: '💊', label: 'Medicine', order: 7 },
    { id: 'a8', emoji: '🌙', label: 'Sleep', order: 8 },
  ],
  [
    { id: 'b1', emoji: '☀️', label: 'Wake Up', order: 1 },
    { id: 'b2', emoji: '🪥', label: 'Brush Teeth', order: 2 },
    { id: 'b3', emoji: '🍳', label: 'Breakfast', order: 3 },
    { id: 'b4', emoji: '💊', label: 'Morning Medicine', order: 4 },
    { id: 'b5', emoji: '📰', label: 'Read Newspaper', order: 5 },
    { id: 'b6', emoji: '🍽️', label: 'Lunch', order: 6 },
    { id: 'b7', emoji: '😴', label: 'Afternoon Rest', order: 7 },
    { id: 'b8', emoji: '🌙', label: 'Sleep', order: 8 },
  ],
  [
    { id: 'c1', emoji: '⏰', label: 'Alarm Rings', order: 1 },
    { id: 'c2', emoji: '🙏', label: 'Prayer', order: 2 },
    { id: 'c3', emoji: '🪥', label: 'Brush Teeth', order: 3 },
    { id: 'c4', emoji: '☕', label: 'Morning Tea', order: 4 },
    { id: 'c5', emoji: '🍳', label: 'Breakfast', order: 5 },
    { id: 'c6', emoji: '💊', label: 'Medicine', order: 6 },
    { id: 'c7', emoji: '🌙', label: 'Sleep', order: 7 },
  ],
];

export default function DailyRoutine() {
  const { language, currentUserId, voiceEnabled } = useApp();
  const navigate = useNavigate();
  const difficulty = calculateDifficulty(currentUserId, 'daily-routine');

  const [activities, setActivities] = useState<RoutineActivity[]>([]);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds] = useState(5);
  const [score, setScore] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showResult, setShowResult] = useState<'correct' | 'partial' | 'wrong' | null>(null);
  const [hintsLeft, setHintsLeft] = useState(difficulty.adjustments.hintsEnabled ? 2 : 0);

  // Initialize round
  useEffect(() => {
    const set = ROUTINE_SETS[Math.floor(Math.random() * ROUTINE_SETS.length)];
    const count = Math.min(4 + Math.floor(difficulty.newLevel / 2), set.length);
    const selected = set.slice(0, count);
    // Shuffle for user to sort
    const shuffled = [...selected].sort(() => Math.random() - 0.5);
    setActivities(shuffled);
    setUserOrder([]);
    setShowResult(null);
  }, [roundNumber]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (roundNumber === 1) setGameStarted(true);
  }, [roundNumber]);

  const handleSelectActivity = useCallback((id: string) => {
    if (showResult) return;
    if (userOrder.includes(id)) {
      setUserOrder(prev => prev.filter(x => x !== id));
    } else {
      setUserOrder(prev => [...prev, id]);
    }
  }, [userOrder, showResult]);

  const checkOrder = useCallback(() => {
    const correctOrder = [...activities].sort((a, b) => a.order - b.order).map(a => a.id);
    const isCorrect = userOrder.length === correctOrder.length &&
      userOrder.every((id, i) => id === correctOrder[i]);

    if (isCorrect) {
      setShowResult('correct');
      setScore(s => s + difficulty.newLevel * 15);
      setCorrectRounds(c => c + 1);
      if (voiceEnabled) speakGamePhrase('correct', language);
    } else {
      // Check partial correctness
      let correctCount = 0;
      userOrder.forEach((id, i) => {
        if (id === correctOrder[i]) correctCount++;
      });
      const ratio = correctCount / correctOrder.length;
      if (ratio >= 0.5) {
        setShowResult('partial');
        setScore(s => s + Math.round(difficulty.newLevel * 15 * ratio));
      } else {
        setShowResult('wrong');
      }
      if (voiceEnabled) speakGamePhrase('wrong', language);
    }

    // Next round
    setTimeout(() => {
      if (roundNumber >= totalRounds) {
        setGameOver(true);
        if (voiceEnabled) speakGamePhrase('gameOver', language);
        const finalScore = Math.round((correctRounds / totalRounds) * 100);
        const session: GameSession = {
          id: uuidv4(), userId: currentUserId, gameType: 'daily-routine',
          difficulty: difficulty.newLevel, score: finalScore, maxScore: 100,
          accuracy: finalScore, timeSpent: timer,
          completedAt: new Date().toISOString(), hintsUsed: 2 - hintsLeft,
        };
        saveGameSession(session);
        updateAfterSession(session);
      } else {
        setRoundNumber(r => r + 1);
      }
    }, 1500);
  }, [userOrder, activities, roundNumber, totalRounds, difficulty, voiceEnabled, language, correctRounds, timer, hintsLeft]);

  const useHint = () => {
    if (hintsLeft <= 0) return;
    setHintsLeft(h => h - 1);
    // Auto-sort correctly
    const correctOrder = [...activities].sort((a, b) => a.order - b.order).map(a => a.id);
    setUserOrder(correctOrder.slice(0, Math.min(userOrder.length + 2, correctOrder.length)));
    if (voiceEnabled) speakGamePhrase('hint', language);
  };

  const resetGame = () => {
    setRoundNumber(1);
    setScore(0);
    setCorrectRounds(0);
    setTimer(0);
    setGameOver(false);
    setHintsLeft(difficulty.adjustments.hintsEnabled ? 2 : 0);
    setGameStarted(true);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const progress = (roundNumber / totalRounds) * 100;

  // Activities not yet selected
  const available = activities.filter(a => !userOrder.includes(a.id));
  const selected = userOrder.map(id => activities.find(a => a.id === id)!).filter(Boolean);

  return (
    <div className="game-container">
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/games')} style={{ marginBottom: 'var(--space-lg)' }}>
        ← {t(language, 'back')}
      </button>

      <div className="game-header">
        <div>
          <h2 style={{ fontSize: 'var(--font-xl)' }}>📋 {t(language, 'dailyRoutine')}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Round {roundNumber}/{totalRounds} — {correctRounds} correct
          </p>
        </div>
        <div className="game-info">
          <span>⏱️ {formatTime(timer)}</span>
          <span>🎯 {score} pts</span>
          {hintsLeft > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={useHint}>💡 {hintsLeft}</button>
          )}
        </div>
      </div>

      <div className="game-progress-bar">
        <div className="fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--font-lg)' }}>{t(language, 'dailyRoutineInstruction')}</p>
      </div>

      {/* Selected Order (user's answer) */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-md)' }}>
          📝 Your Order:
        </h3>
        {selected.length > 0 ? (
          <div className="routine-list">
            {selected.map((activity, i) => (
              <div
                key={activity.id}
                className={`routine-item ${showResult ? 'selected' : ''} ${
                  showResult === 'correct' ? 'correct' :
                  showResult && i < selected.length ? (
                    [...activities].sort((a, b) => a.order - b.order).map(a => a.id)[i] === activity.id
                      ? 'correct' : 'wrong'
                  ) : ''
                }`}
                onClick={() => !showResult && handleSelectActivity(activity.id)}
                style={{ cursor: showResult ? 'default' : 'pointer' }}
              >
                <div className="item-number">{i + 1}</div>
                <span className="item-icon">{activity.emoji}</span>
                <span className="item-text">{activity.label}</span>
                {!showResult && <span style={{ fontSize: '24px', color: 'var(--text-muted)' }}>✕</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-base)' }}>
              Tap activities below to put them in order
            </p>
          </div>
        )}
      </div>

      {/* Available Activities */}
      {available.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-md)' }}>
            📌 Available:
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', justifyContent: 'center' }}>
            {available.map(activity => (
              <button
                key={activity.id}
                className="btn btn-outline btn-lg"
                onClick={() => handleSelectActivity(activity.id)}
                style={{ minWidth: '140px' }}
              >
                {activity.emoji} {activity.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Check Button */}
      {userOrder.length > 0 && !showResult && (
        <div style={{ textAlign: 'center', margin: 'var(--space-xl) 0' }}>
          <button className="btn btn-primary btn-lg" onClick={checkOrder}>
            ✅ Check Order
          </button>
        </div>
      )}

      {/* Feedback */}
      {showResult && (
        <div style={{
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          background: showResult === 'correct' ? '#E8F5E9' : showResult === 'partial' ? '#FFF3E0' : '#FFEBEE',
          textAlign: 'center',
          fontSize: 'var(--font-lg)',
          fontWeight: 600,
        }}>
          {showResult === 'correct' && `✅ ${t(language, 'correct')}`}
          {showResult === 'partial' && '🟡 Almost there! Some items were in the right place.'}
          {showResult === 'wrong' && '❌ Not quite. The correct order was different.'}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
          ⚡ {difficulty.reason}
        </span>
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="game-result-overlay" onClick={(e) => e.target === e.currentTarget && resetGame()}>
          <div className="game-result-card">
            <div className="result-emoji">📋</div>
            <h2>{t(language, 'gameOver')}</h2>
            <div className="result-score">{score}</div>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              {correctRounds}/{totalRounds} correct rounds
            </div>
            <div className="result-details">
              <div>🎯 {Math.round((correctRounds / totalRounds) * 100)}%</div>
              <div>⏱️ {formatTime(timer)}</div>
            </div>
            <div className="result-actions">
              <button className="btn btn-primary btn-lg" onClick={resetGame}>
                🔄 {t(language, 'playAgain')}
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => navigate('/games')}>
                ← {t(language, 'back')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
