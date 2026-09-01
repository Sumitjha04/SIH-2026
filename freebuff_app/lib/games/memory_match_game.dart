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

const _emojiSets = [
  ['🐘', '🐂', '🦌', '🐒', '🌺', '🪷'],
  ['🍵', '🍚', '🥘', '🍢', '🫖', '🥥'],
  ['⛰️', '🌊', '🌳', '🦋', '🌸', '🦜'],
  ['🍎', '🍊', '🍇', '🍓', '🍒', '🫐'],
  ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'],
];

class MemoryMatchGame extends StatefulWidget {
  const MemoryMatchGame({super.key});
  @override
  State<MemoryMatchGame> createState() => _MemoryMatchGameState();
}

class _MemoryMatchGameState extends State<MemoryMatchGame> {
  late List<String> _cards;
  late List<bool> _revealed;
  late List<bool> _matched;
  int? _firstChoice;
  int _score = 0;
  int _moves = 0;
  int _matchedPairs = 0;
  int _timer = 0;
  int _hintsLeft = 3;
  bool _gameStarted = false;
  bool _gameOver = false;
  Timer? _timerRef;
  int _difficulty = 3;
  String _difficultyReason = '';
  int _totalPairs = 8;

  @override
  void initState() {
    super.initState();
    _initGame();
  }

  @override
  void dispose() {
    _timerRef?.cancel();
    super.dispose();
  }

  Future<void> _initGame() async {
    _difficulty = await AiEngine.calculateDifficulty('memoryMatch');
    _difficultyReason = AiEngine.getDifficultyReason(_difficulty, 50);
    _totalPairs = (_difficulty <= 3 ? 4 : _difficulty <= 6 ? 6 : 8);
    final pool = _emojiSets[Random().nextInt(_emojiSets.length)];
    final selected = pool.take(_totalPairs).toList();
    final cards = [...selected, ...selected]..shuffle();
    setState(() {
      _cards = cards;
      _revealed = List.filled(cards.length, false);
      _matched = List.filled(cards.length, false);
      _firstChoice = null;
      _score = 0;
      _moves = 0;
      _matchedPairs = 0;
      _timer = 0;
      _hintsLeft = _difficulty <= 4 ? 3 : 1;
      _gameStarted = true;
      _gameOver = false;
    });
    _timerRef = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _gameStarted && !_gameOver) setState(() => _timer++);
    });
  }

  void _onCardTap(int index) {
    if (_gameOver || _revealed[index] || _matched[index]) return;
    setState(() {
      _revealed[index] = true;
    });

    if (_firstChoice == null) {
      _firstChoice = index;
    } else {
      _moves++;
      final first = _firstChoice!;
      _firstChoice = null;

      if (_cards[first] == _cards[index]) {
        // Match!
        setState(() {
          _matched[first] = true;
          _matched[index] = true;
          _matchedPairs++;
          _score += _difficulty * 10;
        });
        if (_matchedPairs == _totalPairs) _finishGame();
      } else {
        // No match — flip back
        Future.delayed(const Duration(milliseconds: 700), () {
          if (mounted) setState(() { _revealed[first] = false; _revealed[index] = false; });
        });
      }
    }
  }

  void _useHint() {
    if (_hintsLeft <= 0) return;
    // Find an unmatched pair and briefly reveal it
    for (int i = 0; i < _cards.length; i++) {
      if (_matched[i] || _revealed[i]) continue;
      for (int j = i + 1; j < _cards.length; j++) {
        if (_matched[j] || _revealed[j]) continue;
        if (_cards[i] == _cards[j]) {
          setState(() { _revealed[i] = true; _revealed[j] = true; _hintsLeft--; });
          Future.delayed(const Duration(milliseconds: 1200), () {
            if (mounted) setState(() { _revealed[i] = false; _revealed[j] = false; });
          });
          return;
        }
      }
    }
  }

  void _finishGame() async {
    _timerRef?.cancel();
    final finalScore = _score.clamp(0, 100);
    final accuracy = _totalPairs > 0 ? (_matchedPairs / _totalPairs * 100) : 0.0;
    final session = GameSession(
      id: const Uuid().v4(), userId: 'patient-1', gameType: GameType.memoryMatch,
      difficulty: _difficulty, score: finalScore, maxScore: 100,
      accuracy: accuracy, timeSpent: _timer, completedAt: DateTime.now(),
      hintsUsed: 3 - _hintsLeft,
    );
    await StorageService.saveSession(session);
    await AiEngine.updateAfterSession(session);
    if (context.read<AppState>().voiceEnabled) {
      VoiceService.speak('Well done! You scored $finalScore.');
    }
    setState(() { _gameOver = true; _score = finalScore; });
  }

  String _formatTime(int s) => '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppState>().language;
    final cols = _totalPairs <= 4 ? 4 : _totalPairs <= 6 ? 4 : 4;
    final progress = _totalPairs > 0 ? (_matchedPairs / _totalPairs * 100) : 0.0;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
        title: Text('🃏 ${L10n.t(lang, 'memoryMatch')}'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Header info
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('$_matchedPairs/$_totalPairs pairs', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                Row(children: [
                  Text('⏱ ${_formatTime(_timer)}', style: const TextStyle(fontSize: 16)),
                  const SizedBox(width: 16),
                  Text('🎯 $_moves', style: const TextStyle(fontSize: 16)),
                  if (_hintsLeft > 0) ...[
                    const SizedBox(width: 16),
                    GestureDetector(onTap: _useHint, child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: AppTheme.secondary, borderRadius: BorderRadius.circular(20)),
                      child: Text('💡 $_hintsLeft', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    )),
                  ],
                ]),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: progress / 100, backgroundColor: AppTheme.borderLight, color: AppTheme.primary),
            const SizedBox(height: 8),
            Text(_difficultyReason, style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
            const SizedBox(height: 16),

            // Card Grid
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: cols, mainAxisSpacing: 8, crossAxisSpacing: 8),
              itemCount: _cards.length,
              itemBuilder: (ctx, i) {
                final show = _revealed[i] || _matched[i];
                return GestureDetector(
                  onTap: _gameOver ? null : () => _onCardTap(i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    decoration: BoxDecoration(
                      color: _matched[i] ? const Color(0xFFE8F5E9) : show ? Colors.white : const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _matched[i] ? AppTheme.success : show ? AppTheme.primary : AppTheme.border,
                        width: 2,
                      ),
                    ),
                    child: Center(
                      child: Text(show ? _cards[i] : '❓', style: TextStyle(fontSize: show ? 36 : 28)),
                    ),
                  ),
                );
              },
            ),

            // Game Over
            if (_gameOver) ...[
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const Text('🎉', style: TextStyle(fontSize: 64)),
                      Text(L10n.t(lang, 'wellDone'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      Text('$_score', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                      Text(L10n.t(lang, 'yourScore'), style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Text('🎯 $_matchedPairs pairs', style: const TextStyle(fontSize: 14)),
                          Text('📍 $_moves moves', style: const TextStyle(fontSize: 14)),
                          Text('⏱ ${_formatTime(_timer)}', style: const TextStyle(fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(child: ElevatedButton(onPressed: () { setState(() => _gameOver = false); _initGame(); }, child: Text(L10n.t(lang, 'playAgain')))),
                          const SizedBox(width: 12),
                          Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: Text(L10n.t(lang, 'back')))),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
