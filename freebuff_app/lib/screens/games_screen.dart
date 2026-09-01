import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../services/l10n.dart';
import '../theme/app_theme.dart';

class GamesScreen extends StatelessWidget {
  const GamesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppState>().language;
    final games = [
      {'icon': '🃏', 'key': 'memoryMatch', 'desc': 'memoryMatchDesc', 'route': '/memory'},
      {'icon': '🔍', 'key': 'patternRecognition', 'desc': 'patternRecognitionDesc', 'route': '/pattern'},
      {'icon': '📋', 'key': 'dailyRoutine', 'desc': 'dailyRoutineDesc', 'route': '/routine'},
      {'icon': '👁️', 'key': 'attentionFocus', 'desc': 'attentionFocusDesc', 'route': '/attention'},
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('🎮 ${L10n.t(lang, 'games')}', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text('Choose a cognitive game to play', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),

          // Game Cards
          ...games.map((g) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: GestureDetector(
              onTap: () => Navigator.pushNamed(context, g['route']!),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Text(g['icon']!, style: const TextStyle(fontSize: 48)),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(L10n.t(lang, g['key']!), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Text(L10n.t(lang, g['desc']!), style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, size: 28, color: AppTheme.primary),
                    ],
                  ),
                ),
              ),
            ),
          )),

          const SizedBox(height: 16),

          // Voice Game Card
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, '/voice'),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFFE8F5E9), Color(0xFFFFF3E0)]),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primaryLight, width: 2),
              ),
              child: Column(
                children: [
                  const Text('🗣️', style: TextStyle(fontSize: 52)),
                  const SizedBox(height: 8),
                  Text(L10n.t(lang, 'voiceGame'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(L10n.t(lang, 'voiceGameDesc'), style: const TextStyle(fontSize: 16, color: AppTheme.textSecondary)),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(20)),
                    child: const Text('🎤 Tap to Start Voice Mode', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
