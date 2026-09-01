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

const _attentionSets = [
  (normal: '🌸', odd: '🌺'), (normal: '🍎', odd: '🍊'),
  (normal: '🔴', odd: '🔵'), (normal: '🐟', odd: '🐠'),
  (normal: '🎵', odd: '🎶'), (normal: '🐱', odd: '🐯'),
  (normal: '🌳', odd: '🌲'), (normal: '🌻', odd: '🌷'),
];

class AttentionGame extends StatefulWidget {
  const AttentionGame({super.key});
  @override
  State<AttentionGame> createState() => _AttentionGameState();
}

class _AttentionGameState extends State<AttentionGame> {
  List<String> _grid = [];
  int _oddIndex = 0;
  int _round = 1;
  int _totalRounds = 10;
  int _score = 0;
  int _correct = 0;
  int _timer = 0;
  int _totalTime = 0;
  bool _gameOver = false;
  int _streak = 0;
  Timer? _timerRef;
  int _difficulty = 3;
  int _hintsLeft = 3;

  @override
  void initState() { super.initState(); _initGame(); }
  @override
  void dispose() { _timerRef?.cancel(); super.dispose(); }

  Future<void> _initGame() async {
    _difficulty = await AiEngine.calculateDifficulty('attentionFocus');
    setState(() {
      _round = 1; _score = 0; _correct = 0; _timer = 0; _totalTime = 0;
      _gameOver = false; _streak = 0; _hintsLeft = _difficulty <= 4 ? 3 : 1;
    });
    _timerRef = Timer.periodic(const Duration(seconds: 1), (_) { if (mounted && !_gameOver) setState(() => _timer++); });
    _nextRound();
  }

  void _nextRound() {
    final set = _attentionSets[Random().nextInt(_attentionSets.length)];
    final size = _difficulty <= 3 ? 6 : _difficulty <= 6 ? 9 : 12;
    final oddIdx = Random().nextInt(size);
    final grid = List.filled(size, set.normal);
    grid[oddIdx] = set.odd;
    setState(() { _grid = grid; _oddIndex = oddIdx; _timer = 0; });
  }

  void _onCellTap(int index) {
    if (_gameOver) return;
    _totalTime += _timer;
    if (index == _oddIndex) {
      final bonus = _difficulty * 12 + _streak * 5;
      setState(() { _score += bonus; _correct++; _streak++; });
      if (context.read<AppState>().voiceEnabled) VoiceService.speak('Very good! That is correct!');
    } else {
      setState(() => _streak = 0);
      if (context.read<AppState>().voiceEnabled) VoiceService.speak('Not quite. The different one was at position ${_oddIndex + 1}');
    }
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      if (_round >= _totalRounds) _finishGame();
      else { setState(() => _round++); _nextRound(); }
    });
  }

  void _useHint() {
    if (_hintsLeft <= 0) return;
    setState(() => _hintsLeft--);
    _onCellTap(_oddIndex);
  }

  void _finishGame() async {
    _timerRef?.cancel();
    final finalScore = _totalRounds > 0 ? (_correct / _totalRounds * 100).round() : 0;
    final session = GameSession(
      id: const Uuid().v4(), userId: 'patient-1', gameType: GameType.attentionFocus,
      difficulty: _difficulty, score: finalScore, maxScore: 100,
      accuracy: finalScore.toDouble(), timeSpent: _totalTime, completedAt: DateTime.now(),
      hintsUsed: 3 - _hintsLeft,
    );
    await StorageService.saveSession(session);
    await AiEngine.updateAfterSession(session);
    if (context.read<AppState>().voiceEnabled) VoiceService.speak('Game finished! You scored $finalScore percent.');
    setState(() { _gameOver = true; _score = finalScore; });
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppState>().language;
    final cols = _grid.length <= 6 ? 3 : _grid.length <= 9 ? 3 : 4;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
        title: Text('👁️ ${L10n.t(lang, 'attentionFocus')}'),
        backgroundColor: AppTheme.primary, foregroundColor: Colors.white,
      ),
      body: _gameOver ? _buildResult(lang) : _buildGame(lang, cols),
    );
  }

  Widget _buildGame(String lang, int cols) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Round $_round/$_totalRounds', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
            Row(children: [
              Text('⏱ ${_timer}s', style: TextStyle(fontSize: 15, color: _timer <= 3 ? AppTheme.danger : _timer <= 7 ? AppTheme.warning : AppTheme.textPrimary)),
              const SizedBox(width: 12),
              Text('🎯 $_score pts', style: const TextStyle(fontSize: 15)),
              if (_streak > 1) Text(' 🔥$_streak', style: const TextStyle(fontSize: 15)),
              if (_hintsLeft > 0) ...[
                const SizedBox(width: 12),
                GestureDetector(onTap: _useHint, child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppTheme.secondary, borderRadius: BorderRadius.circular(16)),
                  child: Text('💡 $_hintsLeft', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                )),
              ],
            ]),
          ]),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: _round / _totalRounds),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: _timer > 0 ? 1.0 - (_timer / 15.0) : 1.0,
            backgroundColor: AppTheme.borderLight,
            color: _timer <= 3 ? AppTheme.danger : _timer <= 7 ? AppTheme.warning : AppTheme.primary,
          ),
          const SizedBox(height: 24),
          const Text('Find the different item!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: cols, mainAxisSpacing: 10, crossAxisSpacing: 10),
            itemCount: _grid.length,
            itemBuilder: (ctx, i) {
              return GestureDetector(
                onTap: () => _onCellTap(i),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.border, width: 2),
                  ),
                  child: Center(child: Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      Text(_grid[i], style: const TextStyle(fontSize: 40)),
                      Padding(
                        padding: const EdgeInsets.all(4),
                        child: Text('${i + 1}', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  )),
                ),
              );
            },
          ),
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
              const Text('👁️', style: TextStyle(fontSize: 64)),
              Text(L10n.t(lang, 'gameOver'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('$_score', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w700, color: AppTheme.primary)),
              Text('$_correct/$_totalRounds found', style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
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
