// ============================================
// Memory Match Game
// Flip cards and find matching pairs
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../App';
import { calculateDifficulty, updateAfterSession } from '../ai/adaptiveDifficulty';
import { saveGameSession } from '../store/store';
import { speak, speakGamePhrase } from '../voice/voiceAssistant';
import { t } from '../i18n/languages';
import type { GameSession } from '../types';

// Cultural emoji sets for NER
const EMOJI_SETS: string[][] = [
  ['🐘', '🐂', '🦌', '🐒', '🌺', '🪷'],
  ['🍵', '🍚', '🥘', '🍢', '🫖', '🥥'],
  ['⛰️', '🌊', '🌳', '🦋', '🌸', '🦜'],
  ['🎭', '🪘', '🎵', '🪈', '🎶', '🏮'],
  ['🪷', '🎋', '🪵', '🏔️', '🏞️', '🌅'],
];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

export default function MemoryMatch() {
  const { language, currentUserId, voiceEnabled, soundEnabled } = useApp();
  const navigate = useNavigate();

  const difficulty = calculateDifficulty(currentUserId, 'memory-match');
  const gridSize = difficulty.adjustments.gridSize || 4;
  const totalPairs = Math.floor((gridSize * gridSize) / 2);

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(difficulty.adjustments.hintsEnabled ? 3 : 0);
  const [isLocked, setIsLocked] = useState(false);
  const [previewPhase, setPreviewPhase] = useState(difficulty.adjustments.showPreview);
  const [showHint, setShowHint] = useState<number | null>(null);

  // Initialize cards
  useEffect(() => {
    const emojiPool = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];
    const selectedEmojis = emojiPool.slice(0, totalPairs);
    const cardPairs = [...selectedEmojis, ...selectedEmojis];
    // Shuffle
    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }
    const initialCards = cardPairs.map((emoji, i) => ({
      id: i, emoji, flipped: false, matched: false,
    }));
    setCards(initialCards);

    // If preview mode, show all cards briefly
    if (difficulty.adjustments.showPreview) {
      setCards(initialCards.map(c => ({ ...c, flipped: true })));
      const timer = setTimeout(() => {
        setCards(initialCards.map(c => ({ ...c, flipped: false })));
        setPreviewPhase(false);
        setGameStarted(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setGameStarted(true);
    }
  }, [totalPairs]);

  // Timer
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  // Check game completion
  useEffect(() => {
    if (matchedPairs === totalPairs && gameStarted) {
      setGameOver(true);
      const finalScore = Math.max(0, 100 - (moves - totalPairs) * 5) + Math.max(0, 300 - timer);
      setScore(Math.min(100, finalScore));
      if (voiceEnabled) {
        speakGamePhrase('wellDone', language);
        setTimeout(() => speakGamePhrase('score', language, finalScore), 1500);
      }
      // Save session
      const session: GameSession = {
        id: uuidv4(), userId: currentUserId, gameType: 'memory-match',
        difficulty: difficulty.newLevel, score: finalScore, maxScore: 100,
        accuracy: Math.min(100, Math.round((totalPairs / Math.max(1, moves)) * 100)),
        timeSpent: timer, completedAt: new Date().toISOString(),
        hintsUsed: 3 - hintsLeft,
      };
      saveGameSession(session);
      updateAfterSession(session);
    }
  }, [matchedPairs, totalPairs, gameStarted, gameOver]);

  const handleCardClick = useCallback((id: number) => {
    if (isLocked || gameOver || previewPhase) return;
    if (flippedCards.includes(id)) return;
    if (cards[id].matched) return;

    const newFlipped = [...flippedCards, id];
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setIsLocked(true);

      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        // Match found!
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second ? { ...c, matched: true } : c
          ));
          setMatchedPairs(p => p + 1);
          setFlippedCards([]);
          setIsLocked(false);
          if (voiceEnabled) speakGamePhrase('correct', language);
        }, 400);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second ? { ...c, flipped: false } : c
          ));
          setFlippedCards([]);
          setIsLocked(false);
          if (voiceEnabled) speakGamePhrase('tryAgain', language);
        }, 800);
      }
    }
  }, [flippedCards, cards, isLocked, gameOver, previewPhase, voiceEnabled, language]);

  const useHint = () => {
    if (hintsLeft <= 0) return;
    // Find an unmatched pair and briefly show it
    const unmatchedCards = cards.filter(c => !c.matched && !c.flipped);
    const emojiCount = new Map<string, number[]>();
    unmatchedCards.forEach(c => {
      const ids = emojiCount.get(c.emoji) || [];
      ids.push(c.id);
      emojiCount.set(c.emoji, ids);
    });
    for (const [, ids] of emojiCount) {
      if (ids.length === 2) {
        setShowHint(ids[0]);
        setTimeout(() => setShowHint(null), 1000);
        setHintsLeft(h => h - 1);
        if (voiceEnabled) speakGamePhrase('hint', language);
        return;
      }
    }
  };

  const resetGame = () => {
    const emojiPool = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];
    const selectedEmojis = emojiPool.slice(0, totalPairs);
    const cardPairs = [...selectedEmojis, ...selectedEmojis];
    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }
    setCards(cardPairs.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false })));
    setFlippedCards([]);
    setMatchedPairs(0);
    setMoves(0);
    setScore(0);
    setTimer(0);
    setGameOver(false);
    setHintsLeft(difficulty.adjustments.hintsEnabled ? 3 : 0);
    setGameStarted(true);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const progress = totalPairs > 0 ? (matchedPairs / totalPairs) * 100 : 0;

  return (
    <div className="game-container">
      {/* Back button */}
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/games')} style={{ marginBottom: 'var(--space-lg)' }}>
        ← {t(language, 'back')}
      </button>

      {/* Game Header */}
      <div className="game-header">
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: 'var(--font-xl)' }}>🃏 {t(language, 'memoryMatch')}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {previewPhase ? '👀 Remember the cards!' : `${matchedPairs}/${totalPairs} pairs found`}
          </p>
        </div>
        <div className="game-info">
          <span>⏱️ {formatTime(timer)}</span>
          <span>🎯 {moves} {t(language, 'score')}</span>
          {hintsLeft > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={useHint}
              style={{ minWidth: 'auto' }}
            >
              💡 {hintsLeft}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="game-progress-bar">
        <div className="fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Game Board */}
      <div className="game-board">
        <div
          className="memory-grid"
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {cards.map(card => (
            <div
              key={card.id}
              className={`memory-card ${card.flipped ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`}
              onClick={() => handleCardClick(card.id)}
              style={showHint === card.id ? {
                borderColor: 'var(--secondary)',
                boxShadow: '0 0 20px rgba(255,143,0,0.5)',
                transform: 'scale(1.05)',
              } : undefined}
              role="button"
              aria-label={card.flipped || card.matched ? card.emoji : 'Hidden card'}
              tabIndex={0}
            >
              {card.flipped || card.matched ? (
                <span style={{ animation: card.matched ? 'matchPulse 0.5s' : undefined }}>
                  {card.emoji}
                </span>
              ) : (
                <span className="card-back">❓</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty indicator */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
          ⚡ {difficulty.reason}
        </span>
      </div>

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="game-result-overlay" onClick={(e) => e.target === e.currentTarget && resetGame()}>
          <div className="game-result-card">
            <div className="result-emoji">🎉</div>
            <h2>{t(language, 'wellDone')}</h2>
            <div className="result-score">{score}</div>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              {t(language, 'yourScore')}
            </div>
            <div className="result-details">
              <div>🎯 {matchedPairs} pairs</div>
              <div>📍 {moves} moves</div>
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
