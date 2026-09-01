// ============================================
// Attention Focus Game
// Find the different item in a grid
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../App';
import { calculateDifficulty, updateAfterSession } from '../ai/adaptiveDifficulty';
import { saveGameSession } from '../store/store';
import { speakGamePhrase } from '../voice/voiceAssistant';
import { t } from '../i18n/languages';
import type { GameSession } from '../types';

const EMOJI_SETS = [
  { normal: '🐘', odd: '🐘', oddStyle: 'tusk', label: 'elephant' },
  { normal: '🌸', odd: '🌺', label: 'flower' },
  { normal: '🍵', odd: '☕', label: 'cup' },
  { normal: '🔴', odd: '🔵', label: 'color' },
  { normal: '🍎', odd: '🍊', label: 'fruit' },
  { normal: '⛰️', odd: '🏔️', label: 'mountain' },
  { normal: '🎵', odd: '🎶', label: 'music' },
  { normal: '🦋', odd: '🐛', label: 'bug' },
  { normal: '🌳', odd: '🌲', label: 'tree' },
  { normal: '🌻', odd: '🌷', label: 'flower2' },
  { normal: '🐟', odd: '🐠', label: 'fish' },
  { normal: '🐱', odd: '🐯', label: 'cat' },
];

// For harder levels, we use subtle visual differences
const SUBTLE_SETS = [
  { normal: '🙂', odd: '😐', label: 'face1' },
  { normal: '😊', odd: '🙂', label: 'face2' },
  { normal: '🟥', odd: '🟧', label: 'red' },
  { normal: '🟦', odd: '🟪', label: 'blue' },
  { normal: '➕', odd: '✖️', label: 'math' },
  { normal: '⬛', odd: '◼️', label: 'square' },
];

interface Round {
  grid: string[];
  oddIndex: number;
  gridSize: number;
  timeLimit: number;
}

function generateRound(level: number): Round {
  const useSubtle = level >= 6;
  const pool = useSubtle ? SUBTLE_SETS : EMOJI_SETS;
  const set = pool[Math.floor(Math.random() * pool.length)];
  const gridSize = level <= 3 ? 9 : level <= 6 ? 16 : 25;
  const oddIndex = Math.floor(Math.random() * gridSize);
  const grid = Array(gridSize).fill(set.normal);
  grid[oddIndex] = set.odd;
  const timeLimit = Math.max(5, 15 - level);
  return { grid, oddIndex, gridSize, timeLimit };
}

export default function AttentionFocus() {
  const { language, currentUserId, voiceEnabled } = useApp();
  const navigate = useNavigate();
  const difficulty = calculateDifficulty(currentUserId, 'attention-focus');

  const [round, setRound] = useState<Round>(() => generateRound(difficulty.newLevel));
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds] = useState(10);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [streak, setStreak] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(difficulty.adjustments.hintsEnabled ? 3 : 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Round timer
  useEffect(() => {
    if (!gameStarted || gameOver || showResult) return;

    setTimeLeft(round.timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setShowResult('timeout');
          setStreak(0);
          if (voiceEnabled) speakGamePhrase('wrong', language);
          setTimeout(() => nextRound(), 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundNumber, gameStarted, gameOver, showResult]);

  useEffect(() => {
    if (roundNumber === 1) setGameStarted(true);
  }, [roundNumber]);

  const nextRound = useCallback(() => {
    if (roundNumber >= totalRounds) {
      setGameOver(true);
      setTotalTime(t => t + (round.timeLimit - timeLeft));
      if (voiceEnabled) speakGamePhrase('gameOver', language);
      const finalScore = Math.round((correctAnswers / totalRounds) * 100);
      const session: GameSession = {
        id: uuidv4(), userId: currentUserId, gameType: 'attention-focus',
        difficulty: difficulty.newLevel, score: finalScore, maxScore: 100,
        accuracy: finalScore, timeSpent: totalTime,
        completedAt: new Date().toISOString(), hintsUsed: 3 - hintsLeft,
      };
      saveGameSession(session);
      updateAfterSession(session);
    } else {
      setRound(generateRound(difficulty.newLevel));
      setRoundNumber(r => r + 1);
      setShowResult(null);
    }
  }, [roundNumber, totalRounds, difficulty, voiceEnabled, language, correctAnswers, totalTime, timeLeft, hintsLeft]);

  const handleCellClick = useCallback((index: number) => {
    if (showResult || gameOver) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setTotalTime(t => t + (round.timeLimit - timeLeft));

    if (index === round.oddIndex) {
      setShowResult('correct');
      const timeBonus = Math.round(timeLeft * difficulty.newLevel);
      const streakBonus = streak * 5;
      setScore(s => s + difficulty.newLevel * 10 + timeBonus + streakBonus);
      setCorrectAnswers(c => c + 1);
      setStreak(s => s + 1);
      if (voiceEnabled) speakGamePhrase('correct', language);
    } else {
      setShowResult('wrong');
      setStreak(0);
      if (voiceEnabled) speakGamePhrase('wrong', language);
    }

    setTimeout(nextRound, 1000);
  }, [round, showResult, gameOver, timeLeft, difficulty, streak, voiceEnabled, language, nextRound]);

  const useHint = () => {
    if (hintsLeft <= 0) return;
    setHintsLeft(h => h - 1);
    // Briefly highlight the odd cell
    setShowResult('correct');
    setTimeout(() => {
      setShowResult(null);
      nextRound();
    }, 1500);
    if (voiceEnabled) speakGamePhrase('hint', language);
  };

  const resetGame = () => {
    setRound(generateRound(difficulty.newLevel));
    setRoundNumber(1);
    setScore(0);
    setCorrectAnswers(0);
    setTotalTime(0);
    setGameOver(false);
    setShowResult(null);
    setStreak(0);
    setHintsLeft(difficulty.adjustments.hintsEnabled ? 3 : 0);
    setGameStarted(true);
  };

  const cols = round.gridSize <= 9 ? 3 : round.gridSize <= 16 ? 4 : 5;
  const progress = (roundNumber / totalRounds) * 100;
  const timerColor = timeLeft <= 3 ? 'var(--danger)' : timeLeft <= 7 ? 'var(--warning)' : 'var(--primary)';

  return (
    <div className="game-container">
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/games')} style={{ marginBottom: 'var(--space-lg)' }}>
        ← {t(language, 'back')}
      </button>

      <div className="game-header">
        <div>
          <h2 style={{ fontSize: 'var(--font-xl)' }}>👁️ {t(language, 'attentionFocus')}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Round {roundNumber}/{totalRounds} — {t(language, 'attentionFocusDesc')}
          </p>
        </div>
        <div className="game-info">
          <span style={{ color: timerColor, fontWeight: 700 }}>⏱️ {timeLeft}s</span>
          <span>🎯 {score} pts</span>
          {streak > 1 && <span>🔥 {streak}</span>}
          {hintsLeft > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={useHint}>💡 {hintsLeft}</button>
          )}
        </div>
      </div>

      <div className="game-progress-bar">
        <div className="fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Timer Bar */}
      <div style={{
        width: '100%',
        height: '8px',
        background: 'var(--border-light)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        marginBottom: 'var(--space-lg)',
      }}>
        <div style={{
          height: '100%',
          width: `${(timeLeft / round.timeLimit) * 100}%`,
          background: timerColor,
          borderRadius: 'var(--radius-full)',
          transition: 'width 1s linear',
        }} />
      </div>

      {/* Grid */}
      <div className="attention-grid" style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        maxWidth: `${cols * 110}px`,
        margin: '0 auto',
      }}>
        {round.grid.map((emoji, i) => (
          <div
            key={i}
            className={`attention-cell ${
              showResult && i === round.oddIndex ? 'correct' :
              showResult === 'wrong' && i !== round.oddIndex ? '' : ''
            }`}
            onClick={() => handleCellClick(i)}
            style={showResult && i === round.oddIndex ? {
              animation: 'matchPulse 0.5s ease',
              boxShadow: '0 0 20px rgba(76, 175, 80, 0.5)',
            } : undefined}
            role="button"
            aria-label={`Cell ${i + 1}: ${emoji}`}
            tabIndex={0}
          >
            {emoji}
          </div>
        ))}
      </div>

      {/* Feedback */}
      {showResult && (
        <div style={{
          marginTop: 'var(--space-xl)',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          background: showResult === 'correct' ? '#E8F5E9' : showResult === 'timeout' ? '#FFF3E0' : '#FFEBEE',
          textAlign: 'center',
          fontSize: 'var(--font-lg)',
          fontWeight: 600,
        }}>
          {showResult === 'correct' && `✅ ${t(language, 'correct')}${streak > 1 ? ` 🔥 ${streak} streak!` : ''}`}
          {showResult === 'wrong' && `❌ That was not the one! The different item was here.`}
          {showResult === 'timeout' && `⏰ Time's up! The different item was here.`}
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
            <div className="result-emoji">👁️</div>
            <h2>{t(language, 'gameOver')}</h2>
            <div className="result-score">{score}</div>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              {correctAnswers}/{totalRounds} found correctly
            </div>
            <div className="result-details">
              <div>🎯 {Math.round((correctAnswers / totalRounds) * 100)}%</div>
              <div>⏱️ {totalTime}s total</div>
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
