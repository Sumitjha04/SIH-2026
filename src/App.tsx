// ============================================
// App.tsx — Main Application Entry
// ============================================

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import type { Language } from './types';
import { initializeDemoData, getUser } from './store/store';
import { t, languageNames } from './i18n/languages';
import { speak, isVoiceSupported } from './voice/voiceAssistant';
import Home from './pages/Home';
import Games from './pages/Games';
import MemoryMatch from './pages/MemoryMatch';
import PatternRecognition from './pages/PatternRecognition';
import DailyRoutine from './pages/DailyRoutine';
import AttentionFocus from './pages/AttentionFocus';
import VoiceGame from './pages/VoiceGame';
import Reminders from './pages/Reminders';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import './index.css';

// ---- Context ----
interface AppContextType {
  language: Language;
  setLanguage: (l: Language) => void;
  currentUserId: string;
  fontSize: number;
  setFontSize: (s: number) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export const AppContext = createContext<AppContextType>(null!);
export function useApp() { return useContext(AppContext); }

// ---- Sidebar Component ----
function Sidebar() {
  const { language, currentUserId } = useApp();
  const location = useLocation();
  const user = getUser(currentUserId);

  const navItems = [
    { to: '/', icon: '🏠', label: t(language, 'home') },
    { to: '/games', icon: '🎮', label: t(language, 'games') },
    { to: '/games/voice', icon: '🗣️', label: 'Voice Games' },
    { to: '/reminders', icon: '⏰', label: t(language, 'reminders') },
    { to: '/dashboard', icon: '📊', label: t(language, 'dashboard') },
    { to: '/settings', icon: '⚙️', label: t(language, 'settings') },
  ];

  return (
    <nav className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-logo">
        <span className="logo-icon">🧠</span>
        <h1>Freebuff</h1>
        <p>NER Cognitive Care</p>
      </div>

      <div className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive || (item.to !== '/' && location.pathname.startsWith(item.to)) ? 'active' : ''}`
            }
            end={item.to === '/'}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      {user && (
        <div className="sidebar-user">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role === 'patient' ? '👤 Patient' : '🩺 Caregiver'}</div>
        </div>
      )}
    </nav>
  );
}

// ---- Toast Component ----
function Toast({ message, type, onClose }: { message: string; type: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast ${type}`} role="alert">
      {type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'} {message}
    </div>
  );
}

// ---- Main App ----
export default function App() {
  // Initialize demo data on first load
  useEffect(() => {
    initializeDemoData();
  }, []);

  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem('cogassist_lang') as Language) || 'en'
  );
  const [fontSize, setFontSize] = useState<number>(
    () => Number(localStorage.getItem('cogassist_fontsize')) || 22
  );
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(
    () => localStorage.getItem('cogassist_voice') !== 'false'
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    () => localStorage.getItem('cogassist_sound') !== 'false'
  );
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const currentUserId = 'patient-1';

  // Persist settings
  useEffect(() => { localStorage.setItem('cogassist_lang', language); }, [language]);
  useEffect(() => {
    localStorage.setItem('cogassist_fontsize', String(fontSize));
    document.documentElement.style.setProperty('--font-base', `${fontSize}px`);
  }, [fontSize]);
  useEffect(() => { localStorage.setItem('cogassist_voice', String(voiceEnabled)); }, [voiceEnabled]);
  useEffect(() => { localStorage.setItem('cogassist_sound', String(soundEnabled)); }, [soundEnabled]);

  const showToast = useCallback((message: string, type: string = 'success') => {
    setToast({ message, type });
  }, []);

  const ctx: AppContextType = {
    language, setLanguage, currentUserId, fontSize, setFontSize,
    voiceEnabled, setVoiceEnabled, soundEnabled, setSoundEnabled, showToast,
  };

  return (
    <AppContext.Provider value={ctx}>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/games" element={<Games />} />
              <Route path="/games/memory-match" element={<MemoryMatch />} />
              <Route path="/games/pattern-recognition" element={<PatternRecognition />} />
              <Route path="/games/daily-routine" element={<DailyRoutine />} />
              <Route path="/games/attention-focus" element={<AttentionFocus />} />
              <Route path="/games/voice" element={<VoiceGame />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </BrowserRouter>
    </AppContext.Provider>
  );
}
