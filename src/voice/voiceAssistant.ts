// ============================================
// Voice Assistant Module
// Speech Recognition & Text-to-Speech for
// elderly-friendly voice interaction
// ============================================

import type { Language } from '../types';

// Map our languages to BCP-47 speech recognition codes
const speechLangMap: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  asm: 'as-IN',
  ben: 'bn-IN',
  mnp: 'mni-IN',
  kha: 'en-IN', // fallback
  nag: 'en-IN',
  mizo: 'en-IN',
  tri: 'en-IN',
};

// ---- Speech Recognition ----

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionType = any; // Browser API

let recognition: SpeechRecognitionType | null = null;

export function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function startListening(
  language: Language,
  onResult: (transcript: string, isFinal: boolean) => void,
  onError?: (error: string) => void,
): () => void {
  if (!isVoiceSupported()) {
    onError?.('Voice recognition not supported on this device');
    return () => {};
  }

  const SpeechRecognition = (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang = speechLangMap[language];
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const result = event.results[event.resultIndex];
    const transcript = result[0].transcript;
    onResult(transcript, result.isFinal);
  };

  recognition.onerror = (event: any) => {
    if (event.error !== 'aborted') {
      onError?.(event.error || 'Voice recognition error');
    }
  };

  recognition.onend = () => {
    recognition = null;
  };

  recognition.start();

  return () => {
    recognition?.stop();
    recognition = null;
  };
}

// ---- Text-to-Speech ----

export function speak(
  text: string,
  language: Language,
  options?: { rate?: number; pitch?: number; volume?: number }
): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLangMap[language];
    utterance.rate = options?.rate ?? 0.8; // Slower for elderly
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(speechLangMap[language].split('-')[0]));
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

// ---- Quick Phrases for Games ----

export function speakGamePhrase(
  phrase: 'correct' | 'wrong' | 'tryAgain' | 'wellDone' | 'gameOver' | 'score' | 'hint',
  language: Language,
  scoreValue?: number,
): void {
  const phrases: Record<string, Record<Language, string>> = {
    correct: {
      en: 'Very good! That is correct!',
      hi: 'बहुत अच्छा! यह सही है!',
      asm: 'বহু ভাল! ইয়া শুদ্ধ!',
      ben: 'খুব ভালো! এটি সঠিক!',
      mnp: 'য়াম্না!',
      kha: 'Pa khublei!',
      nag: 'Temo!',
      mizo: 'A i!',
      tri: 'Acha!',
    },
    wrong: {
      en: 'Not quite right. Try again!',
      hi: 'ठीक नहीं है। फिर से कोशिश करें!',
      asm: 'শুদ্ধ নহে। আকৌ চেষ্টা কৰক!',
      ben: 'সঠিক নয়। আবার চেষ্টা করুন!',
      mnp: 'য়ামদে। অমুক হন্না হোবা!',
      kha: 'Ya wrong. Khuba phan ym!',
      nag: 'Wrong. Try again!',
      mizo: 'A ngeilo. Hawn leh rawh!',
      tri: 'Wrong. Phai nan!'
    },
    tryAgain: {
      en: 'Almost there! Keep trying!',
      hi: 'लगभग हो गया! कोशिश करते रहें!',
      asm: 'প্ৰায় হয় গ\'ল! চেষ্টা কৰি থাকক!',
      ben: 'প্রায় হয়ে গেছে! চেষ্টা চালিয়ে যান!',
      mnp: 'লামদা। হোবা চালো!',
      kha: 'Ha biti! Sngewphi!',
      nag: 'Almost! Keep trying!',
      mizo: 'A i lo! Hawn leh rawh!',
      tri: 'Almost! Phai nan!',
    },
    wellDone: {
      en: 'Wonderful! You did it!',
      hi: 'शानदार! आपने कर दिखाया!',
      asm: 'দারুণ! আপুনি কৰি উলিলে!',
      ben: 'দারুণ! আপনি করে ফেলেছেন!',
      mnp: 'য়াম্না! নসিনা কুদোম্লে!',
      kha: 'Pa khublei! Ban nong!',
      nag: 'Well done!',
      mizo: 'A i!',
      tri: 'Acha!',
    },
    gameOver: {
      en: 'Game finished! Great effort!',
      hi: 'खेल खत्म! बहुत अच्छा प्रयास!',
      asm: 'খেল শেষ! বহু ভাল চেষ্টা!',
      ben: 'খেলা শেষ! খুব ভালো চেষ্টা!',
      mnp: 'কুদোম লপ্তি!',
      kha: 'Phan ayng! Pa khublei!',
      nag: 'Game done!',
      mizo: 'Khel khal!',
      tri: 'Game done!',
    },
    score: {
      en: `Your score is ${scoreValue || 0}!`,
      hi: `आपका स्कोर है ${scoreValue || 0}!`,
      asm: `আপোনাৰ স্কৰ ${scoreValue || 0}!`,
      ben: `আপনার স্কোর ${scoreValue || 0}!`,
      mnp: `নসি স্কোর ${scoreValue || 0}!`,
      kha: `Your score ${scoreValue || 0}!`,
      nag: `Score: ${scoreValue || 0}!`,
      mizo: `I score: ${scoreValue || 0}!`,
      tri: `Score: ${scoreValue || 0}!`,
    },
    hint: {
      en: 'Here is a hint. Look carefully!',
      hi: 'यहाँ एक संकेत है। ध्यान से देखें!',
      asm: 'এতিয়া টোকা। মনোযোগেৰে চাওক!',
      ben: 'এখানে একটি ইঙ্গিত আছে। মনোযোগ দিন!',
      mnp: 'এতিয়া হিন্ত। মনোযোগে চাও!',
      kha: 'Here is a hint!',
      nag: 'Here is a hint!',
      mizo: 'I hint a!',
      tri: 'Hint le!',
    },
  };

  const phraseMap = phrases[phrase];
  const text = phraseMap?.[language] || phraseMap?.en || phrase;
  speak(text, language);
}
