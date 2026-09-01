// ============================================
// Voice-Controlled Game Mode
// Play games entirely by speaking answers
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../App';
import { calculateDifficulty, updateAfterSession } from '../ai/adaptiveDifficulty';
import { saveGameSession } from '../store/store';
import { speak, speakGamePhrase } from '../voice/voiceAssistant';
import {
  useVoiceRecognition,
  normalizeSpoken,
  spokenToEmoji,
  spokenToNumber,
  matchOption,
} from '../voice/useVoiceRecognition';
import { t } from '../i18n/languages';
import type { GameSession, GameType } from '../types';

// ---- Emoji Sets ----
const EMOJI_SETS: string[][] = [
  ['🐘', '🐂', '🦌', '🐒', '🌺', '🪷'],
  ['🍵', '🍚', '🥘', '🍢', '🫖', '🥥'],
  ['⛰️', '🌊', '🌳', '🦋', '🌸', '🦜'],
  ['🎭', '🪘', '🎵', '🪈', '🎶', '🏮'],
  ['🍎', '🍊', '🍇', '🍓', '🍒', '🫐'],
  ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'],
];

// Pattern sets for voice
const PATTERN_SETS_V: string[][] = [
  ['🌸', '🌺', '🌻', '🌷', '🌹'],
  ['🐘', '🐂', '🦌', '🐒', '🦜'],
  ['🍵', '🍚', '🥘', '🍵', '🍚'],
  ['🔴', '🔵', '🟢', '🔴', '🔵'],
  ['⛰️', '🌊', '🌳', '⛰️', '🌊'],
  ['🎵', '🪘', '🪈', '🎵', '🪘'],
];

// Daily routine activities
interface RoutineActivity { id: string; emoji: string; label: string; spokenNames: string[]; order: number; }
const DAILY_ROUTINES: RoutineActivity[][] = [
  [
    { id: 'a1', emoji: '🌅', label: 'Wake Up', spokenNames: ['wake', 'wake up', 'wakeup', 'morning'], order: 1 },
    { id: 'a2', emoji: '🪥', label: 'Brush Teeth', spokenNames: ['brush', 'brush teeth', 'teeth', 'toothbrush'], order: 2 },
    { id: 'a3', emoji: '🚿', label: 'Bath', spokenNames: ['bath', 'shower', 'bathroom'], order: 3 },
    { id: 'a4', emoji: '☕', label: 'Morning Tea', spokenNames: ['tea', 'chai', 'morning tea'], order: 4 },
    { id: 'a5', emoji: '🍳', label: 'Breakfast', spokenNames: ['breakfast', 'eat', 'food'], order: 5 },
    { id: 'a6', emoji: '🚶', label: 'Walk', spokenNames: ['walk', 'morning walk', 'exercise'], order: 6 },
    { id: 'a7', emoji: '💊', label: 'Medicine', spokenNames: ['medicine', 'tablet', 'pill', 'drug'], order: 7 },
    { id: 'a8', emoji: '🌙', label: 'Sleep', spokenNames: ['sleep', 'night', 'bed', 'rest'], order: 8 },
  ],
  [
    { id: 'b1', emoji: '⏰', label: 'Alarm', spokenNames: ['alarm', 'clock', 'wake'], order: 1 },
    { id: 'b2', emoji: '🙏', label: 'Prayer', spokenNames: ['prayer', 'pray', 'pooja'], order: 2 },
    { id: 'b3', emoji: '🪥', label: 'Brush', spokenNames: ['brush', 'teeth'], order: 3 },
    { id: 'b4', emoji: '☕', label: 'Tea', spokenNames: ['tea', 'chai'], order: 4 },
    { id: 'b5', emoji: '📰', label: 'Newspaper', spokenNames: ['newspaper', 'paper', 'news', 'read'], order: 5 },
    { id: 'b6', emoji: '🍽️', label: 'Lunch', spokenNames: ['lunch', 'meal', 'eat'], order: 6 },
    { id: 'b7', emoji: '😴', label: 'Rest', spokenNames: ['rest', 'nap', 'sleep'], order: 7 },
  ],
];

// Attention items
const ATTENTION_SETS: { normal: string; odd: string }[] = [
  { normal: '🌸', odd: '🌺' }, { normal: '🍎', odd: '🍊' },
  { normal: '🔴', odd: '🔵' }, { normal: '🐟', odd: '🐠' },
  { normal: '🎵', odd: '🎶' }, { normal: '🐱', odd: '🐯' },
  { normal: '🌳', odd: '🌲' }, { normal: '🌻', odd: '🌷' },
];

type VoiceGameState = 'menu' | 'intro' | 'playing' | 'listening' | 'feedback' | 'result';
type VoiceGameType = 'memory' | 'pattern' | 'routine' | 'attention' | null;

interface VoiceGameResult {
  score: number;
  maxScore: number;
  correct: number;
  total: number;
  timeSpent: number;
}

export default function VoiceGame() {
  const { language, currentUserId, voiceEnabled } = useApp();
  const navigate = useNavigate();
  const difficulty = calculateDifficulty(currentUserId, 'pattern-recognition');

  // Game state
  const [gameType, setGameType] = useState<VoiceGameType>(null);
  const [state, setState] = useState<VoiceGameState>('menu');
  const [score, setScore] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds, setTotalRounds] = useState(8);
  const [timer, setTimer] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [result, setResult] = useState<VoiceGameResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null);

  // Pattern game state
  const [patternSequence, setPatternSequence] = useState<string[]>([]);
  const [patternAnswer, setPatternAnswer] = useState('');
  const [patternOptions, setPatternOptions] = useState<string[]>([]);

  // Memory game state
  const [memoryCards, setMemoryCards] = useState<string[]>([]);
  const [memoryRevealed, setMemoryRevealed] = useState<boolean[]>([]);
  const [memoryFirstChoice, setMemoryFirstChoice] = useState<number | null>(null);

  // Routine game state
  const [routineActivities, setRoutineActivities] = useState<RoutineActivity[]>([]);
  const [routineUserOrder, setRoutineUserOrder] = useState<string[]>([]);

  // Attention game state
  const [attentionGrid, setAttentionGrid] = useState<string[]>([]);
  const [attentionOddIndex, setAttentionOddIndex] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice recognition
  const { isListening, isSupported, lastTranscript, interimTranscript, start, stop, toggle } =
    useVoiceRecognition({
      language,
      onResult: handleVoiceResult,
    });

  // Timer
  useEffect(() => {
    if (state !== 'playing' && state !== 'listening') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  // ---- Voice Result Handler ----
  function handleVoiceResult(transcript: string, isFinal: boolean) {
    if (!isFinal) return;
    const normalized = normalizeSpoken(transcript);
    setStatusMessage(`🗣️ "${transcript}"`);

    // Check for quit/exit commands
    if (['quit', 'exit', 'stop', 'end', 'go back', 'home'].some(c => normalized.includes(c))) {
      speak('Goodbye! Great job today!', language);
      setState('menu');
      setGameType(null);
      return;
    }

    if (gameType === 'pattern') handlePatternVoice(transcript);
    else if (gameType === 'attention') handleAttentionVoice(transcript);
    else if (gameType === 'routine') handleRoutineVoice(transcript);
    else if (gameType === 'memory') handleMemoryVoice(transcript);
  }

  // ---- Pattern Recognition Voice ----
  function handlePatternVoice(transcript: string) {
    const answer = matchOption(transcript, patternOptions);
    if (!answer) {
      speak(`I did not understand. Say one of these: ${patternOptions.join(', ')}`, language);
      setStatusMessage('❓ Please say the answer again');
      return;
    }

    stop();
    if (answer === patternAnswer) {
      const pts = difficulty.newLevel * 10;
      setScore(s => s + pts);
      setCorrectAnswers(c => c + 1);
      setFeedbackType('correct');
      speakGamePhrase('correct', language);
    } else {
      setFeedbackType('wrong');
      speakGamePhrase('wrong', language);
      speak(`The answer was ${patternAnswer}`, language);
    }

    setTimeout(() => {
      if (roundNumber >= totalRounds) {
        finishGame();
      } else {
        nextPatternRound();
      }
    }, 2000);
  }

  function nextPatternRound() {
    const pool = PATTERN_SETS_V[Math.floor(Math.random() * PATTERN_SETS_V.length)];
    const seqLen = Math.min(2 + Math.floor(difficulty.newLevel / 2), pool.length - 1);
    const startIdx = Math.floor(Math.random() * Math.max(1, pool.length - seqLen - 1));
    const seq = pool.slice(startIdx, startIdx + seqLen);
    const ans = pool[startIdx + seqLen] || pool[0];
    const wrongs = pool.filter(e => e !== ans).sort(() => Math.random() - 0.5).slice(0, 2);
    const opts = [...wrongs, ans].sort(() => Math.random() - 0.5);

    setPatternSequence(seq);
    setPatternAnswer(ans);
    setPatternOptions(opts);
    setRoundNumber(r => r + 1);
    setFeedbackType(null);
    setState('playing');

    // Speak the prompt
    const seqStr = seq.join(', ');
    setTimeout(() => {
      speak(`Sequence: ${seqStr}. What comes next? Say the emoji name or the number.`, language);
      setTimeout(() => start(), 1500);
    }, 500);
  }

  // ---- Attention Focus Voice ----
  function handleAttentionVoice(transcript: string) {
    const normalized = normalizeSpoken(transcript);
    let found = -1;

    // Match by number position
    const num = spokenToNumber(transcript);
    if (num !== null && num >= 1 && num <= attentionGrid.length) {
      found = num - 1;
    }

    // Match by "different", "odd", "strange"
    if (found === -1 && ['different', 'odd', 'strange', 'unusual', 'unique'].some(w => normalized.includes(w))) {
      found = attentionOddIndex;
    }

    // Match by emoji name
    if (found === -1) {
      const emoji = spokenToEmoji(transcript);
      if (emoji) {
        const idx = attentionGrid.indexOf(emoji);
        if (idx !== -1) found = idx;
      }
    }

    // Match ordinal words
    const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    if (found === -1) {
      const ordIdx = ordinals.findIndex(o => normalized.includes(o));
      if (ordIdx !== -1 && ordIdx < attentionGrid.length) found = ordIdx;
    }

    if (found === -1) {
      speak(`Please say a number from 1 to ${attentionGrid.length}, or say "different" to pick the odd one.`, language);
      setStatusMessage('❓ Say a number or "different"');
      return;
    }

    stop();
    if (found === attentionOddIndex) {
      setScore(s => s + difficulty.newLevel * 12);
      setCorrectAnswers(c => c + 1);
      setFeedbackType('correct');
      speakGamePhrase('correct', language);
    } else {
      setFeedbackType('wrong');
      speakGamePhrase('wrong', language);
      speak(`The different one was at position ${attentionOddIndex + 1}`, language);
    }

    setTimeout(() => {
      if (roundNumber >= totalRounds) finishGame();
      else nextAttentionRound();
    }, 2000);
  }

  function nextAttentionRound() {
    const set = ATTENTION_SETS[Math.floor(Math.random() * ATTENTION_SETS.length)];
    const gridSize = difficulty.newLevel <= 3 ? 6 : difficulty.newLevel <= 6 ? 9 : 12;
    const oddIdx = Math.floor(Math.random() * gridSize);
    const grid = Array(gridSize).fill(set.normal);
    grid[oddIdx] = set.odd;
    setAttentionGrid(grid);
    setAttentionOddIndex(oddIdx);
    setRoundNumber(r => r + 1);
    setFeedbackType(null);
    setState('playing');

    setTimeout(() => {
      speak(`Look at the ${gridSize} items. Say the position number of the one that is different. Say "different" if you spot it.`, language);
      setTimeout(() => start(), 2000);
    }, 500);
  }

  // ---- Daily Routine Voice ----
  function handleRoutineVoice(transcript: string) {
    const normalized = normalizeSpoken(transcript);
    const remaining = routineActivities.filter(a => !routineUserOrder.includes(a.id));

    // Find matching activity by spoken names
    let matched: RoutineActivity | null = null;
    for (const act of remaining) {
      for (const name of act.spokenNames) {
        if (normalized.includes(name) || name.includes(normalized)) {
          matched = act;
          break;
        }
      }
      // Also try emoji name
      if (!matched) {
        const emoji = spokenToEmoji(transcript);
        if (emoji && act.emoji === emoji) matched = act;
      }
    }

    // Number selection
    if (!matched) {
      const num = spokenToNumber(transcript);
      if (num !== null && num >= 1 && num <= remaining.length) {
        matched = remaining[num - 1];
      }
    }

    // Ordinal
    if (!matched) {
      const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
      const ordIdx = ordinals.findIndex(o => normalized.includes(o));
      if (ordIdx !== -1 && ordIdx < remaining.length) matched = remaining[ordIdx];
    }

    if (!matched) {
      const names = remaining.map((a, i) => `${i + 1}. ${a.label}`).join(', ');
      speak(`Please say an activity name or number. Available: ${names}`, language);
      setStatusMessage('❓ Say an activity name');
      return;
    }

    setRoutineUserOrder(prev => [...prev, matched!.id]);
    speak(`Added: ${matched.label}`, language);
    setStatusMessage(`✅ Added: ${matched.emoji} ${matched.label}`);

    // Check if all selected
    if (routineUserOrder.length + 1 >= routineActivities.length) {
      stop();
      checkRoutineOrder([...routineUserOrder, matched.id]);
    }
  }

  function checkRoutineOrder(order: string[]) {
    const correctOrder = [...routineActivities].sort((a, b) => a.order - b.order).map(a => a.id);
    let correctCount = 0;
    order.forEach((id, i) => {
      if (id === correctOrder[i]) correctCount++;
    });
    const ratio = correctCount / correctOrder.length;
    const pts = Math.round(difficulty.newLevel * 15 * ratio);
    setScore(s => s + pts);
    if (ratio >= 0.7) {
      setCorrectAnswers(c => c + 1);
      setFeedbackType('correct');
      speakGamePhrase('correct', language);
    } else {
      setFeedbackType('wrong');
      speakGamePhrase('wrong', language);
    }

    setTimeout(() => {
      if (roundNumber >= totalRounds) finishGame();
      else nextRoutineRound();
    }, 2500);
  }

  function nextRoutineRound() {
    const set = DAILY_ROUTINES[Math.floor(Math.random() * DAILY_ROUTINES.length)];
    const count = Math.min(4 + Math.floor(difficulty.newLevel / 2), set.length);
    const selected = [...set].sort(() => Math.random() - 0.5).slice(0, count);
    setRoutineActivities(selected);
    setRoutineUserOrder([]);
    setRoundNumber(r => r + 1);
    setFeedbackType(null);
    setState('playing');

    const names = selected.map((a, i) => `${i + 1}: ${a.label}`).join('. ');
    setTimeout(() => {
      speak(`Put these activities in order from first to last: ${names}. Say each activity by name or number.`, language);
      setTimeout(() => start(), 2000);
    }, 500);
  }

  // ---- Memory Match Voice ----
  function handleMemoryVoice(transcript: string) {
    const normalized = normalizeSpoken(transcript);
    const num = spokenToNumber(transcript);

    let idx: number | null = null;
    if (num !== null && num >= 1 && num <= memoryCards.length) {
      idx = num - 1;
    }
    // Also try ordinal words
    if (idx === null) {
      const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth',
        'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
        'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth'];
      const ordIdx = ordinals.findIndex(o => normalized.includes(o));
      if (ordIdx !== -1 && ordIdx < memoryCards.length) idx = ordIdx;
    }

    // Try "show number X" or just the number
    if (idx === null) {
      const match = normalized.match(/\d+/);
      if (match) {
        const n = parseInt(match[0]);
        if (n >= 1 && n <= memoryCards.length) idx = n - 1;
      }
    }

    if (idx === null) {
      speak(`Say a card position from 1 to ${memoryCards.length}. Say "show" followed by a number.`, language);
      setStatusMessage('❓ Say a card number');
      return;
    }

    if (memoryRevealed[idx]) {
      speak('That card is already revealed. Pick another.', language);
      return;
    }

    stop();
    const newRevealed = [...memoryRevealed];
    newRevealed[idx] = true;
    setMemoryRevealed(newRevealed);

    speak(`Card ${idx + 1}: ${memoryCards[idx]}`, language);
    setStatusMessage(`🃏 Card ${idx + 1}: ${memoryCards[idx]}`);

    if (memoryFirstChoice === null) {
      setMemoryFirstChoice(idx);
      // Keep listening for second choice
      setTimeout(() => {
        speak('Now say another card number.', language);
        setTimeout(() => start(), 1000);
      }, 1000);
    } else {
      // Second choice — check match
      const firstIdx = memoryFirstChoice;
      setMemoryFirstChoice(null);

      if (memoryCards[firstIdx] === memoryCards[idx] && firstIdx !== idx) {
        setScore(s => s + difficulty.newLevel * 10);
        setCorrectAnswers(c => c + 1);
        setFeedbackType('correct');
        speakGamePhrase('correct', language);
      } else {
        setFeedbackType('wrong');
        speakGamePhrase('wrong', language);
        // Hide after delay
        const r1 = firstIdx, r2 = idx;
        setTimeout(() => {
          setMemoryRevealed(prev => {
            const next = [...prev];
            next[r1] = false;
            next[r2] = false;
            return next;
          });
        }, 1500);
      }

      // Check completion
      setTimeout(() => {
        const allMatched = newRevealed.every((r, i) => !r || memoryCards[i] === memoryCards[(i % 2 === 0 ? i + 1 : i - 1)]);
        const unmatchedPairs = memoryCards.length / 2 - correctAnswers - (feedbackType === 'correct' ? 0 : 0);
        // Simple check: count matched pairs
        const matched = new Set<number>();
        for (let i = 0; i < memoryCards.length; i++) {
          for (let j = i + 1; j < memoryCards.length; j++) {
            if (memoryCards[i] === memoryCards[j] && newRevealed[i] && newRevealed[j]) {
              matched.add(i);
              matched.add(j);
            }
          }
        }
        if (matched.size === memoryCards.length) {
          finishGame();
        } else {
          setTimeout(() => {
            speak('Say another card number.', language);
            setTimeout(() => start(), 1000);
          }, 500);
        }
      }, 500);
    }
  }

  function initMemoryGame() {
    const pool = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];
    const count = Math.min(4, pool.length); // 4 pairs = 8 cards
    const selected = pool.slice(0, count);
    const cards = [...selected, ...selected];
    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    setMemoryCards(cards);
    setMemoryRevealed(new Array(cards.length).fill(false));
    setMemoryFirstChoice(null);
    setTotalRounds(8); // pairs to find
    setRoundNumber(1);

    // Speak the card positions
    const numbered = cards.map((c, i) => `Position ${i + 1}`).join(', ');
    setTimeout(() => {
      speak(`Memory game! I will say card positions. Remember each one. There are ${cards.length} cards. Say "show" followed by a number to flip a card.`, language);
      setTimeout(() => {
        speak(`Positions: ${numbered}. Say a number to begin!`, language);
        setTimeout(() => start(), 2000);
      }, 2000);
    }, 500);
  }

  // ---- Game Flow ----
  function startGame(type: VoiceGameType) {
    setGameType(type);
    setScore(0);
    setRoundNumber(1);
    setCorrectAnswers(0);
    setTimer(0);
    setResult(null);
    setFeedbackType(null);
    setStatusMessage('');

    const rounds = type === 'memory' ? 8 : 8;
    setTotalRounds(rounds);

    if (type === 'pattern') {
      speak(`Pattern Recognition game! Listen to the sequence and say what comes next. Say "quit" to stop.`, language);
      setState('playing');
      setTimeout(() => nextPatternRound(), 2000);
    } else if (type === 'attention') {
      speak(`Attention game! Find the different item. Say its position number. Say "quit" to stop.`, language);
      setState('playing');
      setTimeout(() => nextAttentionRound(), 2000);
    } else if (type === 'routine') {
      speak(`Daily Routine game! Put activities in the right order. Say each activity name. Say "quit" to stop.`, language);
      setState('playing');
      setTimeout(() => nextRoutineRound(), 2000);
    } else if (type === 'memory') {
      speak(`Memory game! Listen and remember card positions. Say "quit" to stop.`, language);
      setState('playing');
      initMemoryGame();
    }
  }

  function finishGame() {
    stop();
    const maxScore = totalRounds * difficulty.newLevel * 12;
    const finalScore = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;
    setResult({
      score, maxScore, correct: correctAnswers,
      total: totalRounds, timeSpent: timer,
    });
    setState('result');

    // Save session
    const gameTypeMap: Record<string, GameType> = {
      memory: 'memory-match',
      pattern: 'pattern-recognition',
      routine: 'daily-routine',
      attention: 'attention-focus',
    };
    const session: GameSession = {
      id: uuidv4(), userId: currentUserId,
      gameType: gameTypeMap[gameType || 'pattern'],
      difficulty: difficulty.newLevel, score: finalScore, maxScore: 100,
      accuracy: Math.round((correctAnswers / totalRounds) * 100),
      timeSpent: timer, completedAt: new Date().toISOString(), hintsUsed: 0,
    };
    saveGameSession(session);
    updateAfterSession(session);

    speakGamePhrase('gameOver', language);
    setTimeout(() => {
      speak(`You scored ${finalScore} percent. ${correctAnswers} out of ${totalRounds} correct.`, language);
    }, 1500);
  }

  function restartGame() {
    if (gameType) startGame(gameType);
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ---- Render ----
  if (state === 'menu') {
    return (
      <div className="game-container">
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/games')} style={{ marginBottom: 'var(--space-lg)' }}>
          ← {t(language, 'back')}
        </button>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <span style={{ fontSize: 80, display: 'block' }}>🗣️</span>
          <h2 style={{ fontSize: 'var(--font-2xl)', marginTop: 'var(--space-md)' }}>Voice Game Mode</h2>
          <p style={{ fontSize: 'var(--font-lg)', color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>
            Play cognitive games entirely by speaking!
          </p>
          {!isSupported && (
            <div style={{
              padding: 'var(--space-md)',
              background: '#FFEBEE',
              borderRadius: 'var(--radius-md)',
              marginTop: 'var(--space-md)',
              fontSize: 'var(--font-sm)',
            }}>
              ⚠️ Voice recognition is not supported on this device. You can still see the visual game.
            </div>
          )}
        </div>

        <div className="grid grid-2" style={{ maxWidth: 700, margin: '0 auto' }}>
          {[
            { type: 'memory' as const, icon: '🧠', title: 'Memory Match', desc: 'Remember and find card pairs by speaking positions' },
            { type: 'pattern' as const, icon: '🔍', title: 'Pattern Recognition', desc: 'Listen to sequences and speak the answer' },
            { type: 'routine' as const, icon: '📋', title: 'Daily Routine', desc: 'Say activity names in the correct order' },
            { type: 'attention' as const, icon: '👁️', title: 'Attention Focus', desc: 'Find the different item by saying its number' },
          ].map(game => (
            <div
              key={game.type}
              className="game-card card-clickable"
              onClick={() => startGame(game.type)}
              role="button"
              tabIndex={0}
            >
              <span className="game-icon">{game.icon}</span>
              <h3>{game.title}</h3>
              <p style={{ fontSize: 'var(--font-sm)' }}>{game.desc}</p>
              <div style={{
                marginTop: 'var(--space-md)',
                padding: 'var(--space-xs) var(--space-md)',
                background: 'var(--bg-hover)',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 'var(--font-xs)',
                color: 'var(--primary)',
                fontWeight: 600,
              }}>
                🗣️ Voice Mode
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ maxWidth: 700, margin: 'var(--space-xl) auto 0', textAlign: 'center' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-md)' }}>How It Works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontSize: 32 }}>1️⃣</span>
              <span style={{ fontSize: 'var(--font-sm)' }}>Choose a game above — the system will speak instructions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontSize: 32 }}>2️⃣</span>
              <span style={{ fontSize: 'var(--font-sm)' }}>Tap the microphone or it starts listening automatically</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontSize: 32 }}>3️⃣</span>
              <span style={{ fontSize: 'var(--font-sm)' }}>Speak your answer — say numbers, emoji names, or activity names</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontSize: 32 }}>4️⃣</span>
              <span style={{ fontSize: 'var(--font-sm)' }}>Get instant spoken feedback — say "quit" to stop anytime</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Result Screen ----
  if (state === 'result' && result) {
    const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
    return (
      <div className="game-container" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div className="game-result-overlay" style={{ position: 'relative' }}>
          <div className="game-result-card" style={{ position: 'relative' }}>
            <div className="result-emoji">{emoji}</div>
            <h2>{t(language, 'gameOver')}</h2>
            <div className="result-score">{pct}%</div>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              {t(language, 'yourScore')}
            </div>
            <div className="result-details">
              <div>🎯 {result.correct}/{result.total}</div>
              <div>⏱️ {formatTime(result.timeSpent)}</div>
            </div>
            <div className="result-actions" style={{ marginTop: 'var(--space-xl)' }}>
              <button className="btn btn-primary btn-lg" onClick={restartGame}>
                🔄 {t(language, 'playAgain')}
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => { setState('menu'); setGameType(null); }}>
                🏠 {t(language, 'home')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Playing Screen ----
  return (
    <div className="game-container" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="game-header">
        <div>
          <h2 style={{ fontSize: 'var(--font-xl)' }}>
            {gameType === 'memory' && '🧠 Memory Match'}
            {gameType === 'pattern' && '🔍 Pattern Recognition'}
            {gameType === 'routine' && '📋 Daily Routine'}
            {gameType === 'attention' && '👁️ Attention Focus'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Round {roundNumber}/{totalRounds}
          </p>
        </div>
        <div className="game-info">
          <span>⏱️ {formatTime(timer)}</span>
          <span>🎯 {score} pts</span>
          <button className="btn btn-danger btn-sm" onClick={() => { stop(); setState('menu'); setGameType(null); }}>
            ⏹ Stop
          </button>
        </div>
      </div>

      <div className="game-progress-bar">
        <div className="fill" style={{ width: `${(roundNumber / totalRounds) * 100}%` }} />
      </div>

      {/* Microphone Button — Large and Prominent */}
      <div style={{ textAlign: 'center', margin: 'var(--space-xl) 0' }}>
        <button
          className={`voice-btn ${isListening ? 'listening' : ''}`}
          onClick={toggle}
          style={{
            width: 120,
            height: 120,
            fontSize: 52,
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? '🔴' : '🎤'}
        </button>
        <div style={{
          marginTop: 'var(--space-md)',
          fontSize: 'var(--font-lg)',
          fontWeight: 600,
          color: isListening ? 'var(--danger)' : 'var(--primary)',
        }}>
          {isListening ? t(language, 'listening') : 'Tap to speak'}
        </div>
        {interimTranscript && (
          <div style={{
            marginTop: 'var(--space-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--bg-hover)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-base)',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}>
            "{interimTranscript}"
          </div>
        )}
      </div>

      {/* Status / Feedback Message */}
      {statusMessage && (
        <div style={{
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          background: feedbackType === 'correct' ? '#E8F5E9' :
            feedbackType === 'wrong' ? '#FFEBEE' : 'white',
          textAlign: 'center',
          fontSize: 'var(--font-lg)',
          fontWeight: 600,
          border: `2px solid ${feedbackType === 'correct' ? 'var(--success)' : feedbackType === 'wrong' ? 'var(--danger)' : 'var(--border)'}`,
          marginBottom: 'var(--space-xl)',
        }}>
          {statusMessage}
        </div>
      )}

      {/* Game-Specific Visual Display */}

      {/* Pattern display */}
      {gameType === 'pattern' && patternSequence.length > 0 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: 'var(--font-lg)' }}>Listen to the sequence:</h3>
          </div>
          <div className="pattern-sequence" style={{ marginBottom: 'var(--space-xl)' }}>
            {patternSequence.map((item, i) => (
              <div key={i} className="pattern-item highlight" style={{ animationDelay: `${i * 0.2}s` }}>
                {item}
              </div>
            ))}
            <div className="pattern-item blank" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>?</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 'var(--font-base)', color: 'var(--text-secondary)' }}>
            🗣️ Say the emoji name or position number of the answer
          </div>
        </div>
      )}

      {/* Attention grid display */}
      {gameType === 'attention' && attentionGrid.length > 0 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: 'var(--font-lg)' }}>Find the different item!</h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              🗣️ Say the position number or "different"
            </p>
          </div>
          <div className="attention-grid" style={{
            gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(attentionGrid.length))}, 1fr)`,
            maxWidth: 500,
            margin: '0 auto',
          }}>
            {attentionGrid.map((emoji, i) => (
              <div key={i} className="attention-cell" style={{ position: 'relative' }}>
                {emoji}
                <span style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 6,
                  fontSize: 'var(--font-xs)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}>
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory display */}
      {gameType === 'memory' && memoryCards.length > 0 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: 'var(--font-lg)' }}>Memory Match</h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              🗣️ Say "show" followed by a card number (1-{memoryCards.length})
            </p>
          </div>
          <div className="memory-grid" style={{
            gridTemplateColumns: `repeat(4, 1fr)`,
            maxWidth: 450,
            margin: '0 auto',
          }}>
            {memoryCards.map((emoji, i) => (
              <div key={i} className={`memory-card ${memoryRevealed[i] ? 'flipped' : ''}`}
                style={{ position: 'relative' }}
              >
                {memoryRevealed[i] ? (
                  <span>{emoji}</span>
                ) : (
                  <>
                    <span className="card-back">❓</span>
                    <span style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 8,
                      fontSize: 'var(--font-sm)',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                    }}>
                      {i + 1}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routine display */}
      {gameType === 'routine' && routineActivities.length > 0 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: 'var(--font-lg)' }}>Put activities in order!</h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              🗣️ Say each activity name in the correct order
            </p>
          </div>

          {/* Available activities */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', justifyContent: 'center', marginBottom: 'var(--space-xl)' }}>
            {routineActivities.map((act, i) => {
              const selected = routineUserOrder.includes(act.id);
              const order = routineUserOrder.indexOf(act.id);
              return (
                <div key={act.id} style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  borderRadius: 'var(--radius-lg)',
                  border: `3px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                  background: selected ? 'var(--bg-hover)' : 'white',
                  textAlign: 'center',
                  fontSize: 'var(--font-lg)',
                  minWidth: 100,
                  opacity: selected ? 0.6 : 1,
                }}>
                  <div style={{ fontSize: 36 }}>{act.emoji}</div>
                  <div style={{ fontSize: 'var(--font-sm)', marginTop: 4 }}>{act.label}</div>
                  {selected && (
                    <div style={{
                      marginTop: 4,
                      fontSize: 'var(--font-xs)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                    }}>
                      #{order + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* User's order so far */}
          {routineUserOrder.length > 0 && (
            <div>
              <h4 style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 'var(--space-sm)' }}>
                Your Order:
              </h4>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                {routineUserOrder.map((id, i) => {
                  const act = routineActivities.find(a => a.id === id)!;
                  return (
                    <span key={id} style={{
                      padding: 'var(--space-xs) var(--space-md)',
                      background: 'var(--primary)',
                      color: 'white',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--font-sm)',
                      fontWeight: 600,
                    }}>
                      {i + 1}. {act.emoji} {act.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice commands hint */}
      <div className="card" style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
          🗣️ Voice commands: Say answers, or say <strong>"quit"</strong> to stop
        </div>
      </div>
    </div>
  );
}
