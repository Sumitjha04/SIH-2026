// ============================================
// Settings Page
// Language, font size, voice, accessibility
// ============================================

import { useApp } from '../App';
import { languageNames } from '../i18n/languages';
import { speak, isVoiceSupported } from '../voice/voiceAssistant';
import { t } from '../i18n/languages';
import type { Language } from '../types';

export default function Settings() {
  const {
    language, setLanguage, fontSize, setFontSize,
    voiceEnabled, setVoiceEnabled, soundEnabled, setSoundEnabled, showToast,
  } = useApp();

  const availableLanguages: Language[] = ['en', 'hi', 'asm', 'ben', 'mnp', 'kha', 'nag', 'mizo', 'tri'];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    showToast(`Language set to ${languageNames[lang]}`);
    if (voiceEnabled) {
      setTimeout(() => speak(`Language changed to ${languageNames[lang]}`, lang), 300);
    }
  };

  const handleVoiceToggle = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled && !isVoiceSupported()) {
      showToast(t(language, 'voiceNotSupported'), 'warning');
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h2>⚙️ {t(language, 'settings')}</h2>
        <p>Customize your experience</p>
      </div>

      {/* Language */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-lg)' }}>
          🌐 {t(language, 'language')}
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          Choose your preferred language for the interface and voice assistance
        </p>
        <div className="lang-grid">
          {availableLanguages.map(lang => (
            <button
              key={lang}
              className={`lang-btn ${language === lang ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang)}
            >
              <div style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>
                {languageNames[lang]}
              </div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                {lang.toUpperCase()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-lg)' }}>
          🔤 {t(language, 'fontSize')}
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          Adjust text size for comfortable reading
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>A</span>
          <input
            type="range"
            min="14"
            max="32"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{ flex: 1, height: 8 }}
          />
          <span style={{ fontSize: 28, fontWeight: 700 }}>A</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
          <span style={{
            fontSize: `${fontSize}px`,
            color: 'var(--primary)',
            fontWeight: 600,
          }}>
            Preview: {fontSize}px
          </span>
        </div>
      </div>

      {/* Voice Assistance */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-lg)' }}>
          🗣️ {t(language, 'voiceAssist')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-base)' }}>Enable Voice</div>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                {isVoiceSupported() ? 'Voice recognition is available' : t(language, 'voiceNotSupported')}
              </div>
            </div>
            <button
              className={`reminder-toggle ${voiceEnabled ? 'active' : ''}`}
              onClick={handleVoiceToggle}
              disabled={!isVoiceSupported()}
            />
          </div>
          {voiceEnabled && (
            <div style={{
              padding: 'var(--space-md)',
              background: '#E8F5E9',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
            }}>
              <button
                className="voice-btn"
                style={{ width: 48, height: 48, fontSize: 20 }}
                onClick={() => speak('Hello! Voice assistant is working.', language)}
              >
                🎤
              </button>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Test Voice</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  Tap to test voice output
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sound Effects */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-lg)' }}>
          🔊 {t(language, 'soundEffects')}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-base)' }}>Enable Sound Effects</div>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              Play sounds during games and reminders
            </div>
          </div>
          <button
            className={`reminder-toggle ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
          />
        </div>
      </div>

      {/* About */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-lg)' }}>
          ℹ️ About Freebuff
        </h3>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p><strong>Freebuff</strong> is an AI-powered cognitive gaming and memory assistance platform designed specifically for elderly dementia patients in the North Eastern Region (NER) of India.</p>
          <p style={{ marginTop: 'var(--space-md)' }}>Features:</p>
          <ul style={{ paddingLeft: 'var(--space-xl)', marginTop: 'var(--space-sm)' }}>
            <li>Interactive cognitive games (Memory, Pattern, Daily Routine, Attention)</li>
            <li>AI-adaptive difficulty based on performance</li>
            <li>Voice-assisted multilingual interface (9 NER languages)</li>
            <li>Culturally familiar themes and content</li>
            <li>Medicine and activity reminders</li>
            <li>Caregiver monitoring dashboard</li>
            <li>Offline functionality support</li>
            <li>Elderly-friendly large UI</li>
          </ul>
          <p style={{ marginTop: 'var(--space-lg)', fontSize: 'var(--font-xs)' }}>
            Version 1.0.0 • Built for NER Healthcare Innovation
          </p>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-lg)' }}>
          🗄️ Data Management
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          All data is stored locally on your device for privacy and offline access.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button
            className="btn btn-outline"
            onClick={() => {
              const data = {
                sessions: localStorage.getItem('cogassist_sessions'),
                metrics: localStorage.getItem('cogassist_metrics'),
                reminders: localStorage.getItem('cogassist_reminders'),
                users: localStorage.getItem('cogassist_users'),
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `freebuff-data-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
              showToast('Data exported successfully!', 'success');
            }}
          >
            📥 Export Data
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Are you sure? This will delete all local data.')) {
                Object.keys(localStorage).forEach(key => {
                  if (key.startsWith('cogassist_')) localStorage.removeItem(key);
                });
                showToast('All data cleared. Reloading...', 'warning');
                setTimeout(() => window.location.reload(), 1000);
              }
            }}
          >
            🗑️ Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
