import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../services/l10n.dart';
import '../services/storage_service.dart';
import '../services/ai_engine.dart';
import '../theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  CognitiveScores? _scores;
  int _sessionsCount = 0;
  String _greeting = '';

  @override
  void initState() {
    super.initState();
    _loadData();
    final h = DateTime.now().hour;
    _greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  }

  Future<void> _loadData() async {
    final scores = await AiEngine.getCognitiveScores();
    final sessions = await StorageService.getRecentSessions(count: 100);
    if (mounted) setState(() { _scores = scores; _sessionsCount = sessions.length; });
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppState>().language;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.primaryDark, AppTheme.primary, AppTheme.primaryLight]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('🙏 $_greeting, Dai Aunto!',
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: Colors.white)),
                const SizedBox(height: 4),
                Text(L10n.t(lang, 'welcome') + ' to Freebuff',
                    style: const TextStyle(fontSize: 18, color: Colors.white70)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _statItem('${_scores?.overall.round() ?? 0}', L10n.t(lang, 'cognitiveScore')),
                    _statItem('$_sessionsCount', L10n.t(lang, 'sessionsPlayed')),
                    _statItem(L10n.t(lang, 'improving'), L10n.t(lang, 'trend')),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Games Section
          Text('🎮 ${L10n.t(lang, 'games')}', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          _gameGrid(context, lang),
          const SizedBox(height: 24),

          // Cognitive Scores
          Text('🧠 ${L10n.t(lang, 'cognitiveScore')}', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          Row(
            children: [
              _scoreCard('🧩', L10n.t(lang, 'memoryScore'), _scores?.memory ?? 50),
              _scoreCard('👁️', L10n.t(lang, 'attentionScore'), _scores?.attention ?? 50),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _scoreCard('🔍', L10n.t(lang, 'patternScore'), _scores?.pattern ?? 50),
              _scoreCard('📋', 'Routine', _scores?.dailyRoutine ?? 50),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statItem(String value, String label) {
    return Column(children: [
      Text(value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: Colors.white)),
      Text(label, style: const TextStyle(fontSize: 13, color: Colors.white70)),
    ]);
  }

  Widget _gameGrid(BuildContext context, String lang) {
    final games = [
      {'icon': '🃏', 'key': 'memoryMatch', 'desc': 'memoryMatchDesc', 'route': '/memory'},
      {'icon': '🔍', 'key': 'patternRecognition', 'desc': 'patternRecognitionDesc', 'route': '/pattern'},
      {'icon': '📋', 'key': 'dailyRoutine', 'desc': 'dailyRoutineDesc', 'route': '/routine'},
      {'icon': '👁️', 'key': 'attentionFocus', 'desc': 'attentionFocusDesc', 'route': '/attention'},
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.1,
      ),
      itemCount: games.length,
      itemBuilder: (ctx, i) {
        final g = games[i];
        return GestureDetector(
          onTap: () => Navigator.pushNamed(context, g['route']!),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(g['icon']!, style: const TextStyle(fontSize: 42)),
                  const SizedBox(height: 8),
                  Text(L10n.t(lang, g['key']!), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
                  const SizedBox(height: 4),
                  Text(L10n.t(lang, g['desc']!), style: const TextStyle(fontSize: 12, color: AppTheme.textMuted), textAlign: TextAlign.center),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _scoreCard(String icon, String label, double value) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            Text(icon, style: const TextStyle(fontSize: 28)),
            const SizedBox(height: 4),
            Text(value.round().toString(), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppTheme.primary)),
            Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          ]),
        ),
      ),
    );
  }
}
