// ============================================
// useVoiceRecognition — React Hook
// Continuous speech recognition for voice games
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Language } from '../types';
import { isVoiceSupported, startListening, speak } from './voiceAssistant';

interface VoiceRecognitionOptions {
  language: Language;
  continuous?: boolean;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface VoiceRecognitionState {
  isListening: boolean;
  isSupported: boolean;
  lastTranscript: string;
  interimTranscript: string;
}

export function useVoiceRecognition({
  language,
  continuous = false,
  onResult,
  onError,
}: VoiceRecognitionOptions): VoiceRecognitionState & {
  start: () => void;
  stop: () => void;
  toggle: () => void;
} {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const stopRef = useRef<(() => void) | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  onResultRef.current = onResult;
  onErrorRef.current = onError;

  const cleanup = useCallback(() => {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const start = useCallback(() => {
    cleanup();
    const stopFn = startListening(
      language,
      (transcript, isFinal) => {
        if (isFinal) {
          setLastTranscript(transcript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(transcript);
        }
        onResultRef.current(transcript, isFinal);
      },
      (error) => {
        onErrorRef.current?.(error);
        setIsListening(false);
        stopRef.current = null;
      },
    );
    stopRef.current = stopFn;
    setIsListening(true);
  }, [language, cleanup]);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  useEffect(() => cleanup, [cleanup]);

  return {
    isListening,
    isSupported: isVoiceSupported(),
    lastTranscript,
    interimTranscript,
    start,
    stop,
    toggle,
  };
}

// ---- Voice-Game Word Matching ----

/** Normalize spoken text to match expected answers */
export function normalizeSpoken(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Common number words to digits */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  won: 1, too: 2, to: 2, for: 4, ate: 8,
};

/** Convert spoken number to digit */
export function spokenToNumber(text: string): number | null {
  const normalized = normalizeSpoken(text);
  // Try direct number
  const direct = parseInt(normalized);
  if (!isNaN(direct) && direct >= 1 && direct <= 20) return direct;
  // Try word
  if (NUMBER_WORDS[normalized] !== undefined) return NUMBER_WORDS[normalized];
  return null;
}

/** Emoji name mapping for voice answers */
const EMOJI_NAMES: Record<string, string> = {
  elephant: '🐘', sun: '☀️', sunflower: '🌻', flower: '🌸',
  rose: '🌹', tulip: '🌷', hibiscus: '🌺', tea: '🍵', rice: '🍚',
  food: '🥘', red: '🔴', blue: '🔵', green: '🟢', mountain: '⛰️',
  water: '🌊', tree: '🌳', music: '🎵', drum: '🪘', flute: '🪈',
  cow: '🐂', deer: '🦌', monkey: '🐒', bird: '🦜', parrot: '🦜',
  moon: '🌙', star: '⭐', cloud: '☁️', rain: '🌧️', fire: '🔥',
  smile: '😊', face: '🙂', cat: '🐱', tiger: '🐯', fish: '🐟',
  butterfly: '🦋', apple: '🍎', orange: '🍊', plus: '➕', minus: '➖',
  one: '1️⃣', two: '2️⃣', three: '3️⃣', four: '4️⃣', five: '5️⃣', six: '6️⃣',
  wake: '🌅', brush: '🪥', bath: '🚿', breakfast: '🍳', walk: '🚶',
  medicine: '💊', sleep: '🌙', newspaper: '📰', lunch: '🍽️', rest: '😴',
  prayer: '🙏', alarm: '⏰', morning: '☀️', evening: '🌆', night: '🌙',
};

/** Match spoken text to an emoji */
export function spokenToEmoji(text: string): string | null {
  const normalized = normalizeSpoken(text);
  // Direct match
  if (EMOJI_NAMES[normalized]) return EMOJI_NAMES[normalized];
  // Partial match
  for (const [name, emoji] of Object.entries(EMOJI_NAMES)) {
    if (normalized.includes(name) || name.includes(normalized)) return emoji;
  }
  return null;
}

/** Match spoken text to a game option (emoji or label) */
export function matchOption(spoken: string, options: string[]): string | null {
  const normalized = normalizeSpoken(spoken);

  // 1. Direct emoji match
  const emojiMatch = spokenToEmoji(spoken);
  if (emojiMatch && options.includes(emojiMatch)) return emojiMatch;

  // 2. Check if spoken contains any option emoji name
  for (const opt of options) {
    const optName = Object.entries(EMOJI_NAMES).find(([_, e]) => e === opt)?.[0];
    if (optName && (normalized.includes(optName) || optName.includes(normalized))) {
      return opt;
    }
    // 3. Direct emoji match
    if (normalized.includes(opt) || opt.includes(normalized)) return opt;
  }

  // 4. Number match (pick option by position)
  const num = spokenToNumber(spoken);
  if (num !== null && num >= 1 && num <= options.length) {
    return options[num - 1];
  }

  // 5. "first", "second", "third" etc.
  const ordinals: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    last: -1, next: -2,
  };
  for (const [word, pos] of Object.entries(ordinals)) {
    if (normalized.includes(word)) {
      if (pos === -1) return options[options.length - 1];
      if (pos === -2) return options[0]; // "next" → first available
      if (pos >= 1 && pos <= options.length) return options[pos - 1];
    }
  }

  return null;
}
