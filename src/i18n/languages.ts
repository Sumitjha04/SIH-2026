// ============================================
// Multilingual Support for NER Languages
// ============================================

import type { Language } from '../types';

export interface TranslationSet {
  home: string; games: string; reminders: string; dashboard: string;
  settings: string; profile: string; welcome: string; play: string;
  pause: string; stop: string; next: string; back: string;
  score: string; level: string; time: string; hints: string; hint: string;
  correct: string; tryAgain: string; wellDone: string; greatJob: string;
  keepTrying: string; gameOver: string; yourScore: string; playAgain: string;
  memoryMatch: string; patternRecognition: string; dailyRoutine: string;
  attentionFocus: string; memoryMatchDesc: string; patternRecognitionDesc: string;
  dailyRoutineDesc: string; attentionFocusDesc: string;
  memoryInstruction: string; patternInstruction: string;
  dailyRoutineInstruction: string; attentionInstruction: string;
  medicine: string; hydration: string; activity: string; appointment: string;
  noReminders: string; addReminder: string; reminderTime: string; reminderDays: string;
  cognitiveScore: string; memoryScore: string; attentionScore: string; patternScore: string;
  sessionsPlayed: string; trend: string; improving: string; stable: string;
  declining: string; weeklyProgress: string; gamePerformance: string;
  patientProgress: string; alerts: string; activityLog: string; lastActive: string;
  noAlerts: string; language: string; fontSize: string; voiceAssist: string;
  soundEffects: string; notifications: string; signOut: string;
  listening: string; speakNow: string; voiceNotSupported: string;
  sun: string; mon: string; tue: string; wed: string;
  thu: string; fri: string; sat: string;
  howFeeling: string; happy: string; neutral: string; frustrated: string; confused: string;
}

const en: TranslationSet = {
  home: 'Home', games: 'Games', reminders: 'Reminders', dashboard: 'Dashboard',
  settings: 'Settings', profile: 'Profile', welcome: 'Welcome', play: 'Play',
  pause: 'Pause', stop: 'Stop', next: 'Next', back: 'Back',
  score: 'Score', level: 'Level', time: 'Time', hints: 'Hints', hint: 'Hint',
  correct: 'Correct!', tryAgain: 'Try Again', wellDone: 'Well Done!',
  greatJob: 'Great Job!', keepTrying: 'Keep Trying!', gameOver: 'Game Over',
  yourScore: 'Your Score', playAgain: 'Play Again',
  memoryMatch: 'Memory Match', patternRecognition: 'Pattern Recognition',
  dailyRoutine: 'Daily Routine', attentionFocus: 'Attention Focus',
  memoryMatchDesc: 'Match pairs of cards to test your memory',
  patternRecognitionDesc: 'Find the pattern and complete the sequence',
  dailyRoutineDesc: 'Recall your daily activities in the right order',
  attentionFocusDesc: 'Find the different item quickly!',
  memoryInstruction: 'Look at the cards, remember where each picture is, then find the matching pairs!',
  patternInstruction: 'Look at the pattern, then choose what comes next in the sequence!',
  dailyRoutineInstruction: 'Put these daily activities in the correct order from morning to night!',
  attentionInstruction: 'Find the item that is different from the others!',
  medicine: 'Medicine', hydration: 'Hydration', activity: 'Activity', appointment: 'Appointment',
  noReminders: 'No reminders set', addReminder: 'Add Reminder', reminderTime: 'Time', reminderDays: 'Days',
  cognitiveScore: 'Cognitive Score', memoryScore: 'Memory Score', attentionScore: 'Attention Score',
  patternScore: 'Pattern Score', sessionsPlayed: 'Sessions Played', trend: 'Trend',
  improving: 'Improving ↑', stable: 'Stable →', declining: 'Needs Attention ↓',
  weeklyProgress: 'Weekly Progress', gamePerformance: 'Game Performance',
  patientProgress: 'Patient Progress', alerts: 'Alerts', activityLog: 'Activity Log',
  lastActive: 'Last Active', noAlerts: 'No alerts — all clear!',
  language: 'Language', fontSize: 'Font Size', voiceAssist: 'Voice Assistance',
  soundEffects: 'Sound Effects', notifications: 'Notifications', signOut: 'Sign Out',
  listening: 'Listening...', speakNow: 'Speak now', voiceNotSupported: 'Voice not supported',
  sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed',
  thu: 'Thu', fri: 'Fri', sat: 'Sat',
  howFeeling: 'How are you feeling?', happy: 'Happy', neutral: 'Okay',
  frustrated: 'Frustrated', confused: 'Confused',
};

const hi: TranslationSet = {
  ...en,
  home: 'होम', games: 'खेल', reminders: 'रिमाइंडर', dashboard: 'डैशबोर्ड',
  settings: 'सेटिंग्स', profile: 'प्रोफ़ाइल', welcome: 'स्वागत है', play: 'खेलें',
  pause: 'रुकें', stop: 'बंद', next: 'अगला', back: 'पीछे',
  score: 'स्कोर', level: 'स्तर', time: 'समय', hints: 'संकेत', hint: 'संकेत',
  correct: 'सही!', tryAgain: 'फिर से कोशिश करें', wellDone: 'बहुत बढ़िया!',
  greatJob: 'शानदार!', keepTrying: 'कोशिश करते रहें!', gameOver: 'खेल खत्म',
  yourScore: 'आपका स्कोर', playAgain: 'फिर से खेलें',
  memoryMatch: 'मेमोरी मैच', patternRecognition: 'पैटर्न पहचान',
  dailyRoutine: 'दैनिक दिनचर्या', attentionFocus: 'ध्यान केंद्रित',
  memoryMatchDesc: 'कार्ड्स के जोड़े मिलाकर अपनी याददाश्त की जाँच करें',
  patternRecognitionDesc: 'पैटर्न खोजें और श्रृंखला पूरी करें',
  dailyRoutineDesc: 'अपनी दैनिक गतिविधियों को सही क्रम में याद करें',
  attentionFocusDesc: 'जल्दी से अलग वस्तु खोजें!',
  memoryInstruction: 'कार्ड्स देखें, याद रखें, फिर मिलते-जुलते जोड़े खोजें!',
  patternInstruction: 'पैटर्न देखें, फिर चुनें कि अगला क्या आता है!',
  dailyRoutineInstruction: 'इन गतिविधियों को सुबह से रात तक सही क्रम में रखें!',
  attentionInstruction: 'वह वस्तु खोजें जो बाकी से अलग है!',
  medicine: 'दवाई', hydration: 'पानी', activity: 'गतिविधि', appointment: 'अपॉइंटमेंट',
  noReminders: 'कोई रिमाइंडर नहीं', addReminder: 'रिमाइंडर जोड़ें',
  reminderTime: 'समय', reminderDays: 'दिन',
  cognitiveScore: 'संज्ञानात्मक स्कोर', memoryScore: 'स्मृति स्कोर',
  attentionScore: 'ध्यान स्कोर', patternScore: 'पैटर्न स्कोर',
  sessionsPlayed: 'सत्र खेले', trend: 'रुझान',
  improving: 'सुधार ↑', stable: 'स्थिर →', declining: 'ध्यान दें ↓',
  weeklyProgress: 'साप्ताहिक प्रगति', gamePerformance: 'खेल प्रदर्शन',
  patientProgress: 'मरीज़ की प्रगति', alerts: 'अलर्ट',
  activityLog: 'गतिविधि लॉग', lastActive: 'अंतिम सक्रिय',
  noAlerts: 'कोई अलर्ट नहीं — सब ठीक है!',
  language: 'भाषा', fontSize: 'फ़ॉन्ट आकार', voiceAssist: 'आवाज़ सहायता',
  soundEffects: 'ध्वनि प्रभाव', notifications: 'सूचनाएँ', signOut: 'साइन आउट',
  listening: 'सुन रहे हैं...', speakNow: 'अब बोलें',
  voiceNotSupported: 'इस डिवाइस पर आवाज़ समर्थित नहीं',
  sun: 'रवि', mon: 'सोम', tue: 'मंगल', wed: 'बुध',
  thu: 'गुरु', fri: 'शुक्र', sat: 'शनि',
  howFeeling: 'आप कैसा महसूस कर रहे हैं?', happy: 'खुश', neutral: 'ठीक',
  frustrated: 'परेशान', confused: 'भ्रमित',
};

const asm: TranslationSet = {
  ...en,
  home: 'ঘৰ', games: 'খেল', reminders: 'মনত কৰাই দিয়া', dashboard: 'ডেচবৰ্ড',
  settings: 'ছেটিংছ', profile: 'প্ৰফাইল', welcome: 'স্বাগতম', play: 'খেলক',
  pause: 'ৰোকক', stop: 'বন্ধ কৰক', next: 'পৰৱৰ্তী', back: 'পিছলৈ',
  score: 'স্কৰ', level: 'স্তৰ', time: 'সময়', hints: 'টোকা', hint: 'টোকা',
  correct: 'শুদ্ধ!', tryAgain: 'আকৌ চেষ্টা কৰক', wellDone: 'বহু ভাল!',
  greatJob: 'দারুণ!', keepTrying: 'চেষ্টা কৰি থাকক!', gameOver: 'খেল শেষ',
  yourScore: 'আপোনাৰ স্কৰ', playAgain: 'পুনৰ খেলক',
  memoryMatch: 'মেমৰী মেচ', patternRecognition: 'পেটাৰ্ন চিনাক্তকৰণ',
  dailyRoutine: 'দৈনিক দিনচৰ্যা', attentionFocus: 'মনোযোগ',
  memoryMatchDesc: 'কাৰ্ডৰ জোৰা মিলাই সম্হাৰণ পৰীক্ষা কৰক',
  patternRecognitionDesc: 'পেটাৰ্ন বিচাৰক',
  dailyRoutineDesc: 'দৈনিক কাৰ্যকলাপ শুদ্ধ ক্ৰমত মনত পেলাওক',
  attentionFocusDesc: 'সোনকালে ফৰক বস্তু বিচাৰক!',
  memoryInstruction: 'কাৰ্ড চাওক, মনত ৰাখক, তাৰপৰ মিল পাওক!',
  patternInstruction: 'পেটাৰ্ন চাওক, তাৰপৰ বাছনি কৰক!',
  dailyRoutineInstruction: 'কাৰ্যকলাপ শুদ্ধ ক্ৰমত ৰাখক!',
  attentionInstruction: 'ফৰক বস্তু বিচাৰক!',
  medicine: 'ওষুধ', hydration: 'পানী', activity: 'কাৰ্যকলাপ', appointment: 'সাক্ষাৎ',
  noReminders: 'মনত কৰাই দিয়া নাই', addReminder: 'মনত কৰাই দিয়া যোগ কৰক',
  reminderTime: 'সময়', reminderDays: 'দিন',
  cognitiveScore: 'জ্ঞানীয় স্কৰ', memoryScore: 'সম্হাৰণ স্কৰ',
  attentionScore: 'মনোযোগ স্কৰ', patternScore: 'পেটাৰ্ন স্কৰ',
  sessionsPlayed: 'সেসন খেলিল', trend: 'প্ৰৱণতা',
  improving: 'উন্নতি ↑', stable: 'স্থিৰ →', declining: 'নজৰ ৰাখিব লাগে ↓',
  weeklyProgress: 'সাপ্তাহিক অগ্ৰগতি', gamePerformance: 'খেলৰ কাৰ্যসম্পাদনা',
  patientProgress: 'ৰোগীৰ অগ্ৰগতি', alerts: 'সতৰ্কতা',
  activityLog: 'কাৰ্যকলাপ লগ', lastActive: 'শেহতিয়াকৈ সক্ৰিয়',
  noAlerts: 'সতৰ্কতা নাই — সকলো ঠিক আছে!',
  language: 'ভাষা', fontSize: 'ফণ্টৰ আকাৰ', voiceAssist: 'কণ্ঠ সহায়',
  soundEffects: 'শব্দ প্ৰভাৱ', notifications: 'জাননী', signOut: 'ছাইন আউট',
  listening: 'শুনি আছে...', speakNow: 'এতিয়া কওক',
  voiceNotSupported: 'সমৰ্থিত নাই',
  sun: 'ৰবি', mon: 'সোম', tue: 'মঙল', wed: 'বুধ',
  thu: 'বৃহ', fri: 'শুক্ৰ', sat: 'শনি',
  howFeeling: 'আপোনাৰ মন কেনেকুৱা আছে?', happy: 'সুখী', neutral: 'ঠিক আছে',
  frustrated: 'পৰেশান', confused: 'বিভ্ৰান্ত',
};

const ben: TranslationSet = {
  ...en,
  home: 'হোম', games: 'খেলা', reminders: 'রিমাইন্ডার', dashboard: 'ড্যাশবোর্ড',
  settings: 'সেটিংস', profile: 'প্রোফাইল', welcome: 'স্বাগতম', play: 'খেলুন',
  pause: 'থামুন', stop: 'বন্ধ', next: 'পরবর্তী', back: 'পেছনে',
  score: 'স্কোর', level: 'স্তর', time: 'সময়', hints: 'ইঙ্গিত', hint: 'ইঙ্গিত',
  correct: 'সঠিক!', tryAgain: 'আবার চেষ্টা করুন', wellDone: 'খুব ভালো!',
  greatJob: 'দারুণ!', keepTrying: 'চেষ্টা চালিয়ে যান!', gameOver: 'খেলা শেষ',
  yourScore: 'আপনার স্কোর', playAgain: 'আবার খেলুন',
  memoryMatch: 'মেমরি ম্যাচ', patternRecognition: 'প্যাটার্ন সনাক্তকরণ',
  dailyRoutine: 'দৈনিক দিনচর্যা', attentionFocus: 'মনোযোগ কেন্দ্রীকরণ',
  memoryMatchDesc: 'কার্ডের জুটি মেলান স্মৃতি পরীক্ষা করুন',
  patternRecognitionDesc: 'প্যাটার্ন খুঁজুন এবং ধারা সম্পূর্ণ করুন',
  dailyRoutineDesc: 'দৈনিক কার্যকলাপ সঠিক ক্রমে মনে করুন',
  attentionFocusDesc: 'দ্রুত আলাদা বস্তু খুঁজুন!',
  memoryInstruction: 'কার্ড দেখুন, মনে রাখুন, তারপর মিল খুঁজুন!',
  patternInstruction: 'প্যাটার্ন দেখুন, তারপর বেছে নিন পরবর্তী কী!',
  dailyRoutineInstruction: 'কার্যকলাপ সঠিক ক্রমে রাখুন!',
  attentionInstruction: 'যে বস্তুটি আলাদা তা খুঁজুন!',
  medicine: 'ওষুধ', hydration: 'পানি', activity: 'কার্যকলাপ', appointment: 'সাক্ষাৎ',
  noReminders: 'কোনো রিমাইন্ডার নেই', addReminder: 'রিমাইন্ডার যোগ করুন',
  reminderTime: 'সময়', reminderDays: 'দিন',
  cognitiveScore: 'জ্ঞানীয় স্কোর', memoryScore: 'স্মৃতি স্কোর',
  attentionScore: 'মনোযোগ স্কোর', patternScore: 'প্যাটার্ন স্কোর',
  sessionsPlayed: 'সেশন খেলেছে', trend: 'প্রবণতা',
  improving: 'উন্নতি ↑', stable: 'স্থিতিশীল →', declining: 'খেলা দেখুন ↓',
  weeklyProgress: 'সাপ্তাহিক অগ্রগতি', gamePerformance: 'খেলার কার্যক্ষমতা',
  patientProgress: 'রোগীর অগ্রগতি', alerts: 'সতর্কতা',
  activityLog: 'কার্যকলাপ লগ', lastActive: 'শেষ সক্রিয়',
  noAlerts: 'কোনো সতর্কতা নেই — সব ঠিক আছে!',
  language: 'ভাষা', fontSize: 'ফন্টের আকার', voiceAssist: 'কণ্ঠ সহায়',
  soundEffects: 'শব্দ প্রভাব', notifications: 'বিজ্ঞপ্তি', signOut: 'সাইন আউট',
  listening: 'শুনছি...', speakNow: 'এখন বলুন', voiceNotSupported: 'সমর্থিত নয়',
  sun: 'রবি', mon: 'সোম', tue: 'মঙল', wed: 'বুধ',
  thu: 'বৃহ', fri: 'শুক্ৰ', sat: 'শনি',
  howFeeling: 'আপনি কেমন অনুভব করছেন?', happy: 'খুশি', neutral: 'ঠিক আছে',
  frustrated: 'হতাশ', confused: 'বিভ্রান্ত',
};

export const allTranslations: Record<Language, TranslationSet> = { en, hi, asm, ben };

export const languageNames: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
  asm: 'অসমীয়া',
  ben: 'বাংলা',
  mnp: 'মৈতৈলোন্',
  kha: 'Khasi',
  nag: 'Naga',
  mizo: 'Mizo',
  tri: 'Tripuri',
};

export function t(lang: Language, key: keyof TranslationSet): string {
  return allTranslations[lang]?.[key] || allTranslations.en[key] || key;
}

// ---- Cultural Themes for NER ----
export const culturalThemes = {
  animals: ['🐘 Elephant', '🐂 Mithun', '🦌 Deer', '🐒 Monkey', '🐦 Hornbill', '🐾 Tiger'],
  festivals: ['Bihu', 'Navratri', 'Christmas', 'Id', 'Yaoshang', 'Chapchar Kut', 'Ambubachi'],
  foods: ['🍵 Tea', '🍚 Rice', '🥘 Fish Curry', '🍢 Momos', '🍜 Thukpa', '🍌 Banana'],
  nature: ['🌸 Orchid', '🌿 Bamboo', '⛰️ Hills', '🌊 River', '🌳 Forest', '🦋 Butterfly'],
  colors: ['🟢 Green', '🔵 Blue', '🔴 Red', '🟡 Yellow', '🟣 Purple', '🟠 Orange'],
  places: ['Shillong', 'Guwahati', 'Imphal', 'Aizawl', 'Kohima', 'Agartala', 'Gangtok'],
  greetings: ['Namaste', 'Nomoskar', 'Khulari', 'Phello', 'Julley'],
};
