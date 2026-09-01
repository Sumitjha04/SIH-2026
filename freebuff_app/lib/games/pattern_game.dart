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

const _patternSets = [
  ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼'],
  ['🐘', '🐂', '🦌', '🐒', '🦜', '🐘'],
  ['🍵', '🍚', '🥘', '🍵', '🍚', '🥘'],
  ['🔴', '🔵', '🟢', '🔴', '🔵', '🟢'],
  ['⛰️', '🌊', '🌳', '⛰️', '🌊', '🌳'],
  ['🎵', '🪘', '🪈', '🎵', '🪘', '🪈'],
];

class PatternGame extends StatefulWidget {
  const PatternGame({super.key});
  @override
  State<PatternGame> createState() => _PatternGameState();
}

class _PatternGameState extends State<PatternGame> {
  List<String> _sequence = [];
  String _answer = '';
  List<String> _options = [];
  int _round = 1;
  int _totalRounds = 8;
  int _score = 0;
  int _correct = 0;
  int _timer = 0;
  bool _gameOver = false;
  String? _feedback;
  bool? _lastCorrect;
  Timer? _timerRef;
  int _difficulty = 3;
  int _hintsLeft = 3;

  @override
  void initState() {
    super.initState();
    _initGame();
  }

  @override
  void dispose() { _timerRef?.cancel(); super.dispose(); }

  Future<void> _initGame() async {
    _difficulty = await AiEngine.calculateDifficulty('patternRecognition');
    setState(() { _round = 1; _score = 0; _correct = 0; _timer = 0; _gameOver = false; _hintsLeft = _difficulty <= 4 ? 3 : 1; });
    _timerRef = Timer.periodic(const Duration(seconds: 1), (_) { if (mounted && !_gameOver) setState(() => _timer++); });
    _nextRound();
  }

  void _nextRound() {
    final pool = _patternSets[Random().nextInt(_patternSets.length)];
    final seqLen = min(2 + (_difficulty ~/ 2), pool.length - 1);
    final start = Random().nextInt(max(1, pool.length - seqLen - 1));
    final seq = pool.sublist(start, start + seqLen);
    final ans = pool[(start + seqLen) % pool.length];
    final wrongs = pool.where((e) => e != ans).toList()..shuffle();
    final opts = [...wrongs.take(2), ans]..shuffle();
    setState(() { _sequence = seq; _answer = ans; _options = opts; _feedback = null; _lastCorrect = null; });
  }

  void _onOptionSelected(String option) {
    if (_feedback != null) return;
    final correct = option == _answer;
    setState(() {
      _feedback = correct ? 'correct' : 'wrong';
      _lastCorrect = correct;
      if (correct) { _score += _difficulty * 10; _correct++; }
    });
    if (context.read<AppState>().voiceEnabled) {
      VoiceService.speak(correct ? 'Very good! That is correct!' : 'Not quite. The answer was $_answer');
    }
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (!mounted) return;
      if (_round >= _totalRounds) {
        _finishGame();
      } else {
        setState(() => _round++);
        _nextRound();
      }
    });
  }

  void _useHint() {
    if (_hintsLeft <= 0) return;
    setState(() => _hintsLeft--);
    if (context.read<AppState>().voiceEnabled) VoiceService.speak('The answer is $_answer');
  }

  void _finishGame() async {
    _timerRef?.cancel();
    final finalScore = _totalRounds > 0 ? (_correct / _totalRounds * 100).round() : 0;
    final session = GameSession(
      id: const Uuid().v4(), userId: 'patient-1', gameType: GameType.patternRecognition,
      difficulty: _difficulty, score: finalScore, maxScore: 100,
      accuracy: finalScore.toDouble(), timeSpent: _timer, completedAt: DateTime.now(),
      hintsUsed: 3 - _hintsLeft,
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
        title: Text('🔍 ${L10n.t(lang, 'patternRecognition')}'),
        backgroundColor: AppTheme.primary, foregroundColor: Colors.white,
      ),
      body: _gameOver ? _buildResult(lang) : _buildGame(lang),
    );
  }

  Widget _buildGame(String lang) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Round $_round/$_totalRounds — $_correct correct', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
            Row(children: [
              Text('⏱ ${_fmt(_timer)}', style: const TextStyle(fontSize: 15)),
              const SizedBox(width: 12),
              Text('🎯 $_score pts', style: const TextStyle(fontSize: 15)),
              if (_hintsLeft > 0) ...[
                const SizedBox(width: 12),
                GestureDetector(onTap: _useHint, child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppTheme.secondary, borderRadius: BorderRadius.circular(16)),
                  child: Text('💡 $_hintsLeft', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
                )),
              ],
            ]),
          ]),
          const SizedBox(height: 12),
          LinearProgressIndicator(value: _round / _totalRounds),
          const SizedBox(height: 24),

          // Instruction
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text('Look at the pattern, then choose what comes next!', style: const TextStyle(fontSize: 16), textAlign: TextAlign.center),
          )),
          const SizedBox(height: 24),

          // Sequence
          Wrap(
            spacing: 12, runSpacing: 12, alignment: WrapAlignment.center,
            children: [
              ..._sequence.map((e) => Container(
                width: 72, height: 72,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border, width: 2)),
                child: Center(child: Text(e, style: const TextStyle(fontSize: 36))),
              )),
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F8E9), borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.border, width: 2),
                ),
                child: const Center(child: Text('?', style: TextStyle(fontSize: 28, color: AppTheme.textMuted))),
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Options
          Wrap(
            spacing: 16, runSpacing: 16, alignment: WrapAlignment.center,
            children: _options.map((opt) {
              Color? borderColor;
              if (_feedback != null && opt == _answer) borderColor = AppTheme.success;
              if (_feedback == 'wrong' && opt != _answer) borderColor = null;
              return GestureDetector(
                onTap: _feedback != null ? null : () => _onOptionSelected(opt),
                child: Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: borderColor ?? AppTheme.border, width: 3),
                  ),
                  child: Center(child: Text(opt, style: const TextStyle(fontSize: 40))),
                ),
              );
            }).toList(),
          ),

          // Feedback
          if (_feedback != null) ...[
            const SizedBox(height: 24),
            Container(
              width: double.infinity, padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _lastCorrect! ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                _lastCorrect! ? '✅ ${L10n.t(lang, 'correct')}' : '❌ The answer was $_answer',
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
              const Text('🧠', style: TextStyle(fontSize: 64)),
              Text(L10n.t(lang, 'gameOver'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('$_score', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w700, color: AppTheme.primary)),
              Text('$_correct/$_totalRounds correct', style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
              const SizedBox(height: 16),
              Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                Text('🎯 ${(_correct / _totalRounds * 100).round()}%', style: const TextStyle(fontSize: 14)),
                Text('⏱ ${_fmt(_timer)}', style: const TextStyle(fontSize: 14)),
              ]),
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
