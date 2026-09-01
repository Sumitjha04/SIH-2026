// ============================================
// Reminders Management Page
// Medicine, hydration, activity, appointment
// ============================================

import { useState } from 'react';
import { useApp } from '../App';
import { getReminders, saveReminder, deleteReminder } from '../store/store';
import { speak } from '../voice/voiceAssistant';
import { t } from '../i18n/languages';
import type { Reminder } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const TYPE_ICONS: Record<string, string> = {
  medicine: '💊', hydration: '💧', activity: '🚶', appointment: '🏥',
};
const TYPE_COLORS: Record<string, string> = {
  medicine: '#E3F2FD', hydration: '#E0F7FA', activity: '#E8F5E9', appointment: '#FFF3E0',
};

export default function Reminders() {
  const { language, currentUserId, voiceEnabled } = useApp();
  const [reminders, setReminders] = useState<Reminder[]>(() => getReminders(currentUserId));
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [formData, setFormData] = useState({
    type: 'medicine' as Reminder['type'],
    title: '',
    description: '',
    time: '08:00',
    days: [0, 1, 2, 3, 4, 5, 6] as number[],
    sound: true,
    voice: true,
  });

  const refreshReminders = () => setReminders(getReminders(currentUserId));

  const openAddModal = () => {
    setEditingReminder(null);
    setFormData({
      type: 'medicine', title: '', description: '',
      time: '08:00', days: [0,1,2,3,4,5,6], sound: true, voice: true,
    });
    setShowModal(true);
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({
      type: reminder.type, title: reminder.title, description: reminder.description,
      time: reminder.time, days: reminder.days, sound: reminder.sound, voice: reminder.voice,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) return;
    const reminder: Reminder = {
      id: editingReminder?.id || uuidv4(),
      userId: currentUserId,
      ...formData,
      enabled: editingReminder?.enabled ?? true,
    };
    saveReminder(reminder);
    refreshReminders();
    setShowModal(false);
    if (voiceEnabled) {
      speak(`Reminder ${editingReminder ? 'updated' : 'created'}: ${formData.title}`, language);
    }
  };

  const handleDelete = (id: string) => {
    deleteReminder(id);
    refreshReminders();
  };

  const toggleReminder = (reminder: Reminder) => {
    const updated = { ...reminder, enabled: !reminder.enabled };
    saveReminder(updated);
    refreshReminders();
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
    }));
  };

  const typeLabels: Record<string, string> = {
    medicine: t(language, 'medicine'),
    hydration: t(language, 'hydration'),
    activity: t(language, 'activity'),
    appointment: t(language, 'appointment'),
  };

  const grouped = {
    medicine: reminders.filter(r => r.type === 'medicine'),
    hydration: reminders.filter(r => r.type === 'hydration'),
    activity: reminders.filter(r => r.type === 'activity'),
    appointment: reminders.filter(r => r.type === 'appointment'),
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h2>⏰ {t(language, 'reminders')}</h2>
          <p>Manage your daily reminders</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          ➕ {t(language, 'addReminder')}
        </button>
      </div>

      {reminders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          <p style={{ fontSize: 'var(--font-lg)', color: 'var(--text-muted)' }}>
            {t(language, 'noReminders')}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, items]) => items.length > 0 && (
          <div key={type} style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-md)' }}>
              {TYPE_ICONS[type]} {typeLabels[type]}
            </h3>
            {items.map(reminder => (
              <div key={reminder.id} className="reminder-card" style={{
                opacity: reminder.enabled ? 1 : 0.6,
              }}>
                <div className={`reminder-icon ${reminder.type}`}>
                  {TYPE_ICONS[reminder.type]}
                </div>
                <div className="reminder-info">
                  <h4>{reminder.title}</h4>
                  <p>{reminder.description}</p>
                  <div style={{ display: 'flex', gap: '4px', marginTop: 'var(--space-xs)' }}>
                    {DAYS.map((day, i) => (
                      <span key={day} style={{
                        fontSize: 'var(--font-xs)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: reminder.days.includes(i) ? 'var(--primary)' : 'var(--border-light)',
                        color: reminder.days.includes(i) ? 'white' : 'var(--text-muted)',
                        fontWeight: 600,
                      }}>
                        {t(language, day)}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-sm)' }}>
                  <div className="reminder-time">{reminder.time}</div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => openEditModal(reminder)}
                      style={{ minWidth: 'auto', padding: '4px 12px', minHeight: '36px', fontSize: 'var(--font-xs)' }}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(reminder.id)}
                      style={{ minWidth: 'auto', padding: '4px 12px', minHeight: '36px', fontSize: 'var(--font-xs)' }}
                    >
                      🗑️
                    </button>
                  </div>
                  <button
                    className={`reminder-toggle ${reminder.enabled ? 'active' : ''}`}
                    onClick={() => toggleReminder(reminder)}
                    aria-label={reminder.enabled ? 'Disable' : 'Enable'}
                  />
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <h3>{editingReminder ? '✏️ Edit' : '➕ Add'} {t(language, 'reminders')}</h3>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as Reminder['type'] }))}
              >
                <option value="medicine">💊 {t(language, 'medicine')}</option>
                <option value="hydration">💧 {t(language, 'hydration')}</option>
                <option value="activity">🚶 {t(language, 'activity')}</option>
                <option value="appointment">🏥 {t(language, 'appointment')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Morning Medicine"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Take blood pressure tablet"
              />
            </div>

            <div className="form-group">
              <label>{t(language, 'reminderTime')}</label>
              <input
                type="time"
                value={formData.time}
                onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>{t(language, 'reminderDays')}</label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    className={`btn btn-sm ${formData.days.includes(i) ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => toggleDay(i)}
                    style={{ minWidth: 'auto' }}
                  >
                    {t(language, day)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.sound}
                  onChange={e => setFormData(prev => ({ ...prev, sound: e.target.checked }))}
                  style={{ width: 22, height: 22 }}
                />
                🔔 {t(language, 'soundEffects')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.voice}
                  onChange={e => setFormData(prev => ({ ...prev, voice: e.target.checked }))}
                  style={{ width: 22, height: 22 }}
                />
                🗣️ {t(language, 'voiceAssist')}
              </label>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingReminder ? '💾 Save' : '➕ Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
