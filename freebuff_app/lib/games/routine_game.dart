import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../services/app_state.dart';
import '../services/l10n.dart';
import '../services/storage_service.dart';
import '../services/ai_engine.dart';
import '../services/voice_service.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class _Activity {
  final String emoji, label;
  final int order;
  _Activity({required this.emoji, required this.label, required this.order});
}

final _routineSets = [
  [
    _Activity(emoji: '🌅', label: 'Wake Up', order: 1),
    _Activity(emoji: '🪥', label: 'Brush Teeth', order: 2),
    _Activity(emoji: '🚿', label: 'Bath', order: 3),
    _Activity(emoji: '☕', label: 'Morning Tea', order: 4),
    _Activity(emoji: '🍳', label: 'Breakfast', order: 5),
    _Activity(emoji: '🚶', label: 'Walk', order: 6),
    _Activity(emoji: '💊', label: 'Medicine', order: 7),
    _Activity(emoji: '🌙', label: 'Sleep', order: 8),
  ],
  [
    _Activity(emoji: '⏰', label: 'Alarm', order: 1),
    _Activity(emoji: '🙏', label: 'Prayer', order: 2),
    _Activity(emoji: '🪥', label: 'Brush', order: 3),
    _Activity(emoji: '☕', label: 'Tea', order: 4),
    _Activity(emoji: '📰', label: 'Newspaper', order: 5),
    _Activity(emoji: '🍽️', label: 'Lunch', order: 6),
    _Activity(emoji: '😴', label: 'Rest', order: 7),
  ],
];

class RoutineGame extends StatefulWidget {
  const RoutineGame({super.key});
  @override
  State<RoutineGame> createState() => _RoutineGameState();
}

class _RoutineGameState extends State<RoutineGame> {
  List<_Activity> _activities = [];
  List<_Activity> _userOrder = [];
  int _round = 1;
  int _totalRounds = 5;
  int _score = 0;
  int _correctRounds = 0;
  int _timer = 0;
  bool _gameOver = false;
  String? _feedback;
  Timer? _timerRef;
  int _difficulty = 3;

  @override
  void initState() { super.initState(); _initGame(); }
  @override
  void dispose() { _timerRef?.cancel(); super.dispose(); }

  Future<void> _initGame() async {
    _difficulty = await AiEngine.calculateDifficulty('dailyRoutine');
    setState(() { _round = 1; _score = 0; _correctRounds = 0; _timer = 0; _gameOver = false; });
    _timerRef = Timer.periodic(const Duration(seconds: 1), (_) { if (mounted && !_gameOver) setState(() => _timer++); });
    _nextRound();
  }

  void _nextRound() {
    final set = _routineSets[Random().nextInt(_routineSets.length)];
    final count = min(4 + (_difficulty ~/ 2), set.length);
    final selected = (set.toList()..shuffle()).take(count).toList();
    setState(() { _activities = selected; _userOrder = []; _feedback = null; });
  }

  void _addActivity(_Activity act) {
    if (_feedback != null || _userOrder.any((a) => a.order == act.order)) return;
    setState(() => _userOrder.add(act));
    if (_userOrder.length >= _activities.length) _checkOrder();
  }

  void _removeActivity(_Activity act) {
    setState(() => _userOrder.removeWhere((a) => a.order == act.order));
  }

  void _checkOrder() {
    final correctOrder = [..._activities]..sort((a, b) => a.order.compareTo(b.order));
    int correctCount = 0;
    for (int i = 0; i < _userOrder.length; i++) {
      if (i < correctOrder.length && _userOrder[i].order == correctOrder[i].order) correctCount++;
    }
    final ratio = correctCount / correctOrder.length;
    final pts = (_difficulty * 15 * ratio).round();
    setState(() {
      _score += pts;
      _feedback = ratio >= 0.7 ? 'correct' : 'wrong';
      if (ratio >= 0.7) _correctRounds++;
    });
    if (context.read<AppState>().voiceEnabled) {
      VoiceService.speak(ratio >= 0.7 ? 'Very good! That is correct!' : 'Not quite right.');
    }
    Future.delayed(const Duration(milliseconds: 2000), () {
      if (!mounted) return;
      if (_round >= _totalRounds) { _finishGame(); }
      else { setState(() => _round++); _nextRound(); }
    });
  }

  void _finishGame() async {
    _timerRef?.cancel();
    final finalScore = _totalRounds > 0 ? (_correctRounds / _totalRounds * 100).round() : 0;
    final session = GameSession(
      id: const Uuid().v4(), userId: 'patient-1', gameType: GameType.dailyRoutine,
      difficulty: _difficulty, score: finalScore, maxScore: 100,
      accuracy: finalScore.toDouble(), timeSpent: _timer, completedAt: DateTime.now(),
    );
    await StorageService.saveSession(session);
    await AiEngine.updateAfterSession(session);
    if (context.read<AppState>().voiceEnabled) VoiceService.speak('Game finished! You scored $finalScore percent.');
    setState(() { _gameOver = true; _score = finalScore; });
  }

  String _fmt(int s) => '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppState>().language;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
        title: Text('📋 ${L10n.t(lang, 'dailyRoutine')}'),
        backgroundColor: AppTheme.primary, foregroundColor: Colors.white,
      ),
      body: _gameOver ? _buildResult(lang) : _buildGame(lang),
    );
  }

  Widget _buildGame(String lang) {
    final available = _activities.where((a) => !_userOrder.any((u) => u.order == a.order)).toList();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Round $_round/$_totalRounds', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
            Row(children: [
              Text('⏱ ${_fmt(_timer)}', style: const TextStyle(fontSize: 15)),
              const SizedBox(width: 12),
              Text('🎯 $_score pts', style: const TextStyle(fontSize: 15)),
            ]),
          ]),
          const SizedBox(height: 12),
          LinearProgressIndicator(value: _round / _totalRounds),
          const SizedBox(height: 24),
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text('Put these daily activities in the correct order from morning to night!', style: const TextStyle(fontSize: 16), textAlign: TextAlign.center),
          )),
          const SizedBox(height: 20),

          // User's order
          if (_userOrder.isNotEmpty) ...[
            const Text('📝 Your Order:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ..._userOrder.asMap().entries.map((e) {
              final i = e.key;
              final a = e.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _feedback == 'correct' ? const Color(0xFFE8F5E9) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.border, width: 2),
                ),
                child: Row(children: [
                  CircleAvatar(backgroundColor: AppTheme.primary, child: Text('${i + 1}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
                  const SizedBox(width: 12),
                  Text(a.emoji, style: const TextStyle(fontSize: 28)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(a.label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500))),
                  if (_feedback == null) IconButton(icon: const Icon(Icons.close), onPressed: () => _removeActivity(a)),
                ]),
              );
            }),
          ],

          // Available
          if (available.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('📌 Available:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10, runSpacing: 10,
              children: available.map((a) => GestureDetector(
                onTap: () => _addActivity(a),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(border: Border.all(color: AppTheme.primary, width: 2), borderRadius: BorderRadius.circular(14)),
                  child: Text('${a.emoji} ${a.label}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                ),
              )).toList(),
            ),
          ],

          if (_feedback != null) ...[
            const SizedBox(height: 20),
            Container(
              width: double.infinity, padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _feedback == 'correct' ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                _feedback == 'correct' ? '✅ ${L10n.t(lang, 'correct')}' : '❌ Not quite right',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600), textAlign: TextAlign.center,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildResult(String lang) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('📋', style: TextStyle(fontSize: 64)),
              Text(L10n.t(lang, 'gameOver'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('$_score', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w700, color: AppTheme.primary)),
              Text('$_correctRounds/$_totalRounds correct rounds', style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
              const SizedBox(height: 24),
              Row(children: [
                Expanded(child: ElevatedButton(onPressed: () { setState(() => _gameOver = false); _initGame(); }, child: Text(L10n.t(lang, 'playAgain')))),
                const SizedBox(width: 12),
                Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: Text(L10n.t(lang, 'back')))),
              ]),
            ]),
          ),
        ),
      ),
    );
  }
}
