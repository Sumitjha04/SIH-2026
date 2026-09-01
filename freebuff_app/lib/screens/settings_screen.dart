import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../services/l10n.dart';
import '../services/voice_service.dart';
import '../theme/app_theme.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final lang = state.language;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('⚙️ ${L10n.t(lang, 'settings')}', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 24),

          // Language
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🌐 Language', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                const Text('Choose your preferred language', style: TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8, runSpacing: 8,
                  children: L10n.supportedLanguages.map((code) {
                    final selected = lang == code;
                    return GestureDetector(
                      onTap: () => state.setLanguage(code),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: selected ? const Color(0xFFE8F5E9) : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: selected ? AppTheme.primary : AppTheme.border, width: 2),
                        ),
                        child: Column(children: [
                          Text(L10n.languageName(code), style: TextStyle(fontSize: 16, fontWeight: selected ? FontWeight.w700 : FontWeight.w500, color: selected ? AppTheme.primary : AppTheme.textPrimary)),
                          Text(code.toUpperCase(), style: TextStyle(fontSize: 11, color: selected ? AppTheme.primary : AppTheme.textMuted)),
                        ]),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          )),
          const SizedBox(height: 16),

          // Font Size
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🔤 Font Size', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Text('A', style: TextStyle(fontSize: 14)),
                    Expanded(
                      child: Slider(
                        value: state.fontSize,
                        min: 14, max: 28,
                        onChanged: (v) => state.setFontSize(v),
                        activeColor: AppTheme.primary,
                      ),
                    ),
                    const Text('A', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
                  ],
                ),
                Center(child: Text('Preview: ${state.fontSize.round()}px', style: TextStyle(fontSize: state.fontSize, color: AppTheme.primary, fontWeight: FontWeight.w600))),
              ],
            ),
          )),
          const SizedBox(height: 16),

          // Voice
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🗣️ Voice Assistance', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('Enable Voice'),
                  subtitle: const Text('Speak instructions and feedback during games'),
                  value: state.voiceEnabled,
                  onChanged: (v) => state.setVoiceEnabled(v),
                  activeColor: AppTheme.primary,
                ),
                if (state.voiceEnabled) ListTile(
                  leading: const CircleAvatar(backgroundColor: AppTheme.primary, child: Icon(Icons.mic, color: Colors.white)),
                  title: const Text('Test Voice'),
                  subtitle: const Text('Tap to test voice output'),
                  onTap: () => VoiceService.speak('Hello! Voice assistant is working.'),
                ),
              ],
            ),
          )),
          const SizedBox(height: 16),

          // Sound
          Card(child: SwitchListTile(
            title: const Text('🔊 Sound Effects', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
            subtitle: const Text('Play sounds during games'),
            value: state.soundEnabled,
            onChanged: (v) => state.setSoundEnabled(v),
            activeColor: AppTheme.primary,
          )),
          const SizedBox(height: 16),

          // About
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('ℹ️ About Freebuff', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                const Text('AI-powered cognitive gaming platform for elderly dementia patients in NER India.', style: TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                const SizedBox(height: 12),
                const Text('Features:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                _feature('🎮 4 cognitive games with adaptive difficulty'),
                _feature('🗣️ Voice-controlled game mode'),
                _feature('🌐 Multilingual support (4 languages)'),
                _feature('📊 Caregiver dashboard with charts'),
                _feature('⏰ Medicine & activity reminders'),
                _feature('📴 Offline functionality'),
                _feature('👴 Elderly-friendly large UI'),
                const SizedBox(height: 8),
                Text('Version 1.0.0 • Built for SIH 2026', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _feature(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 8, top: 4),
      child: Text(text, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
    );
  }
}
