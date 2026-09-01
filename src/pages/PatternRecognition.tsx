// ============================================
// Pattern Recognition Game
// Complete the sequence pattern
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

// Pattern generators
const PATTERN_SETS = [
  { items: ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼'], type: 'repeating' as const },
  { items: ['🐘', '🐂', '🦌', '🐒', '🦜', '🐘'], type: 'cycling' as const },
  { items: ['🍵', '🍚', '🥘', '🍵', '🍚', '🥘'], type: 'repeating' as const },
  { items: ['🔴', '🔵', '🟢', '🔴', '🔵', '🟢'], type: 'repeating' as const },
  { items: ['⛰️', '🌊', '🌳', '⛰️', '🌊', '🌳'], type: 'repeating' as const },
  { items: ['🎵', '🪘', '🪈', '🎵', '🪘', '🪈'], type: 'repeating' as const },
  { items: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'], type: 'sequential' as const },
];

interface Round {
  sequence: string[];
  answer: string;
  options: string[];
}

function generateRound(level: number): Round {
  const pool = PATTERN_SETS[Math.floor(Math.random() * PATTERN_SETS.length)];
  const seqLen = Math.min(3 + Math.floor(level / 2), 5);
  const answerIdx = seqLen;
  const fullSeq = [...pool.items];

  // Take a slice for the pattern
  const startIdx = Math.floor(Math.random() * Math.max(1, fullSeq.length - seqLen));
  const sequence = fullSeq.slice(startIdx, startIdx + seqLen);
  const answer = fullSeq[startIdx + seqLen] || fullSeq[0];

  // Generate wrong options
  const wrongOptions = pool.items.filter(e => e !== answer);
  const shuffled = wrongOptions.sort(() => Math.random() - 0.5).slice(0, Math.min(level >= 7 ? 3 : 2, wrongOptions.length));
  const options = [...shuffled, answer].sort(() => Math.random() - 0.5);

  return { sequence, answer, options };
}

export default function PatternRecognition() {
  const { language, currentUserId, voiceEnabled } = useApp();
  const navigate = useNavigate();
  const difficulty = calculateDifficulty(currentUserId, 'pattern-recognition');

  const [round, setRound] = useState<Round>(() => generateRound(difficulty.newLevel));
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds] = useState(8);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [hintsLeft, setHintsLeft] = useState(difficulty.adjustments.hintsEnabled ? 3 : 0);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (roundNumber === 1) setGameStarted(true);
  }, [roundNumber]);

  const handleOptionClick = useCallback((option: string) => {
    if (showResult || gameOver) return;

    setSelectedOption(option);
    setShowResult(option === round.answer ? 'correct' : 'wrong');

    if (option === round.answer) {
      setScore(s => s + difficulty.newLevel * 10);
      setCorrectAnswers(c => c + 1);
      if (voiceEnabled) speakGamePhrase('correct', language);
    } else {
      if (voiceEnabled) speakGamePhrase('wrong', language);
    }

    // Auto-advance
    setTimeout(() => {
      if (roundNumber >= totalRounds) {
        // Game over
        setGameOver(true);
        if (voiceEnabled) speakGamePhrase('gameOver', language);
        const finalScore = Math.round((correctAnswers / totalRounds) * 100);
        const session: GameSession = {
          id: uuidv4(), userId: currentUserId, gameType: 'pattern-recognition',
          difficulty: difficulty.newLevel, score: finalScore, maxScore: 100,
          accuracy: finalScore, timeSpent: timer,
          completedAt: new Date().toISOString(), hintsUsed: 3 - hintsLeft,
        };
        saveGameSession(session);
        updateAfterSession(session);
      } else {
        setRound(generateRound(difficulty.newLevel));
        setRoundNumber(r => r + 1);
        setSelectedOption(null);
        setShowResult(null);
      }
    }, 1200);
  }, [round, roundNumber, totalRounds, showResult, gameOver, difficulty, voiceEnabled, language]);

  const useHint = () => {
    if (hintsLeft <= 0) return;
    setHintsLeft(h => h - 1);
    if (voiceEnabled) speakGamePhrase('hint', language);
  };

  const resetGame = () => {
    setRound(generateRound(difficulty.newLevel));
    setRoundNumber(1);
    setScore(0);
    setCorrectAnswers(0);
    setTimer(0);
    setGameOver(false);
    setSelectedOption(null);
    setShowResult(null);
    setHintsLeft(difficulty.adjustments.hintsEnabled ? 3 : 0);
    setGameStarted(true);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const progress = (roundNumber / totalRounds) * 100;

  return (
    <div className="game-container">
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/games')} style={{ marginBottom: 'var(--space-lg)' }}>
        ← {t(language, 'back')}
      </button>

      {/* Header */}
      <div className="game-header">
        <div>
          <h2 style={{ fontSize: 'var(--font-xl)' }}>🔍 {t(language, 'patternRecognition')}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Round {roundNumber}/{totalRounds} — {correctAnswers} correct
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

      {/* Instruction */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--font-lg)' }}>{t(language, 'patternInstruction')}</p>
      </div>

      {/* Pattern Sequence */}
      <div className="pattern-sequence">
        {round.sequence.map((item, i) => (
          <div key={i} className="pattern-item highlight" style={{ animationDelay: `${i * 0.15}s` }}>
            {item}
          </div>
        ))}
        <div className="pattern-item blank" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>
          ?
        </div>
      </div>

      {/* Options */}
      <div className="pattern-options">
        {round.options.map((option, i) => (
          <button
            key={i}
            className={`pattern-option ${
              selectedOption === option
                ? showResult === 'correct' ? 'correct' : 'wrong'
                : ''
            }`}
            onClick={() => handleOptionClick(option)}
            disabled={!!showResult}
            aria-label={`Option ${option}`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {showResult && (
        <div style={{
          marginTop: 'var(--space-xl)',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          background: showResult === 'correct' ? '#E8F5E9' : '#FFEBEE',
          textAlign: 'center',
          fontSize: 'var(--font-lg)',
          fontWeight: 600,
        }}>
          {showResult === 'correct'
            ? `✅ ${t(language, 'correct')}`
            : `❌ The answer was ${round.answer}`
          }
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
            <div className="result-emoji">🧠</div>
            <h2>{t(language, 'gameOver')}</h2>
            <div className="result-score">{score}</div>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              {correctAnswers}/{totalRounds} correct
            </div>
            <div className="result-details">
              <div>🎯 {Math.round((correctAnswers / totalRounds) * 100)}%</div>
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
