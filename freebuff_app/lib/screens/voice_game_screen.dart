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

const _pSets = [
  ['🌸', '🌺', '🌻', '🌷', '🌹'],
  ['🐘', '🐂', '🦌', '🐒', '🦜'],
  ['🍵', '🍚', '🥘', '🍵', '🍚'],
  ['🔴', '🔵', '🟢', '🔴', '🔵'],
  ['⛰️', '🌊', '🌳', '⛰️', '🌊'],
];

const _attentionSets = [
  (normal: '🌸', odd: '🌺'), (normal: '🍎', odd: '🍊'),
  (normal: '🔴', odd: '🔵'), (normal: '🐟', odd: '🐠'),
  (normal: '🎵', odd: '🎶'), (normal: '🐱', odd: '🐯'),
];

class VoiceGameScreen extends StatefulWidget {
  const VoiceGameScreen({super.key});
  @override
  State<VoiceGameScreen> createState() => _VoiceGameScreenState();
}

class _VoiceGameScreenState extends State<VoiceGameScreen> {
  String? _selectedGame; // 'pattern', 'attention', 'memory'
  bool _isListening = false;
  int _score = 0;
  int _correct = 0;
  int _round = 1;
  int _totalRounds = 8;
  int _timer = 0;
  bool _gameOver = false;
  Timer? _timerRef;
  int _difficulty = 3;
  String _statusMsg = '';
  bool? _lastFeedback;

  // Pattern state
  List<String> _patternSeq = [];
  String _patternAnswer = '';
  List<String> _patternOptions = [];

  // Attention state
  List<String> _attGrid = [];
  int _attOddIdx = 0;

  // Memory state
  List<String> _memCards = [];
  List<bool> _memRevealed = [];
  int? _memFirst;

  @override
  void dispose() { _timerRef?.cancel(); super.dispose(); }

  Future<void> _startGame(String type) async {
    _difficulty = await AiEngine.calculateDifficulty(type == 'pattern' ? 'patternRecognition' : 'attentionFocus');
    setState(() {
      _selectedGame = type;
      _score = 0; _correct = 0; _round = 1; _timer = 0; _gameOver = false;
      _statusMsg = ''; _lastFeedback = null;
    });
    _timerRef = Timer.periodic(const Duration(seconds: 1), (_) { if (mounted && !_gameOver) setState(() => _timer++); });
    final msg = type == 'pattern'
        ? 'Pattern Recognition! Listen and say what comes next. Say quit to stop.'
        : 'Attention game! Find the different item and say its number.';
    VoiceService.speak(msg);
    Future.delayed(const Duration(seconds: 2), () {
      if (type == 'pattern') _nextPattern();
      else if (type == 'attention') _nextAttention();
      else _initMemory();
    });
  }

  void _nextPattern() {
    final pool = _pSets[Random().nextInt(_pSets.length)];
    final len = min(2 + (_difficulty ~/ 2), pool.length - 1);
    final start = Random().nextInt(max(1, pool.length - len - 1));
    final seq = pool.sublist(start, start + len);
    final ans = pool[(start + len) % pool.length];
    final wrongs = pool.where((e) => e != ans).toList()..shuffle();
    final opts = [...wrongs.take(2), ans]..shuffle();
    setState(() { _patternSeq = seq; _patternAnswer = ans; _patternOptions = opts; _lastFeedback = null; _statusMsg = ''; });
    VoiceService.speak('Sequence: ${seq.join(", ")}. What comes next?');
    _startListening();
  }

  void _nextAttention() {
    final set = _attentionSets[Random().nextInt(_attentionSets.length)];
    final size = _difficulty <= 3 ? 6 : 9;
    final oddIdx = Random().nextInt(size);
    final grid = List.filled(size, set.normal);
    grid[oddIdx] = set.odd;
    setState(() { _attGrid = grid; _attOddIdx = oddIdx; _lastFeedback = null; _statusMsg = ''; });
    VoiceService.speak('Find the different item! Say its position number or say different.');
    _startListening();
  }

  void _initMemory() {
    final emojis = ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼'].take(4).toList();
    final all = [...emojis, ...emojis]..shuffle();
    setState(() { _memCards = all; _memRevealed = List.filled(all.length, false); _memFirst = null; _lastFeedback = null; _statusMsg = ''; });
    VoiceService.speak('Memory game! There are ${all.length} cards. Say show followed by a number.');
    _startListening();
  }

  void _startListening() async {
    final available = await VoiceService.initSpeech();
    if (!available) { setState(() => _statusMsg = 'Voice not available'); return; }
    VoiceService.startListening(onResult: (text, isFinal) {
      if (!isFinal) { setState(() => _statusMsg = '🗣️ "$text"'); return; }
      _handleVoiceInput(text);
    });
    setState(() => _isListening = true);
  }

  void _handleVoiceInput(String text) {
    final norm = text.toLowerCase().trim();
    if (['quit', 'exit', 'stop', 'end', 'go back'].any((c) => norm.contains(c))) {
      VoiceService.stopListening();
      _finishGame();
      return;
    }
    if (_selectedGame == 'pattern') _handlePatternVoice(norm);
    else if (_selectedGame == 'attention') _handleAttentionVoice(norm);
    else _handleMemoryVoice(norm);
  }

  void _handlePatternVoice(String text) {
    // Try number match
    final num = _parseNumber(text);
    if (num != null && num >= 1 && num <= _patternOptions.length) {
      _checkPatternAnswer(_patternOptions[num - 1]);
      return;
    }
    // Try direct emoji match
    for (final opt in _patternOptions) {
      if (text.contains(_emojiName(opt)) || _emojiName(opt).contains(text)) {
        _checkPatternAnswer(opt);
        return;
      }
    }
    VoiceService.speak('Say a number from 1 to ${_patternOptions.length}, or the emoji name.');
  }

  void _checkPatternAnswer(String answer) {
    VoiceService.stopListening();
    final correct = answer == _patternAnswer;
    setState(() { _lastFeedback = correct; _statusMsg = correct ? '✅ Correct!' : '❌ Wrong! Answer was $_patternAnswer'; });
    if (correct) { _score += _difficulty * 10; _correct++; }
    VoiceService.speak(correct ? 'Very good!' : 'Not quite. The answer was $_patternAnswer');
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      if (_round >= _totalRounds) _finishGame();
      else { setState(() => _round++); _nextPattern(); }
    });
  }

  void _handleAttentionVoice(String text) {
    final num = _parseNumber(text);
    int? idx;
    if (num != null && num >= 1 && num <= _attGrid.length) idx = num - 1;
    if (idx == null && ['different', 'odd', 'strange'].any((w) => text.contains(w))) idx = _attOddIdx;
    if (idx == null) { VoiceService.speak('Say a number from 1 to ${_attGrid.length}, or say different.'); return; }

    VoiceService.stopListening();
    final correct = idx == _attOddIdx;
    setState(() { _lastFeedback = correct; _statusMsg = correct ? '✅ Correct!' : '❌ Wrong! The odd one was at position ${_attOddIdx + 1}'; });
    if (correct) { _score += _difficulty * 12; _correct++; }
    VoiceService.speak(correct ? 'Very good!' : 'Not quite. It was at position ${_attOddIdx + 1}');
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      if (_round >= _totalRounds) _finishGame();
      else { setState(() => _round++); _nextAttention(); }
    });
  }

  void _handleMemoryVoice(String text) {
    final num = _parseNumber(text);
    if (num == null || num < 1 || num > _memCards.length) {
      VoiceService.speak('Say show followed by a number from 1 to ${_memCards.length}');
      return;
    }
    final idx = num - 1;
    if (_memRevealed[idx]) { VoiceService.speak('Already revealed. Pick another.'); return; }

    VoiceService.stopListening();
    final newRev = List<bool>.from(_memRevealed);
    newRev[idx] = true;
    setState(() { _memRevealed = newRev; _statusMsg = '🃏 Card $num: ${_memCards[idx]}'; });
    VoiceService.speak('Card $num: ${_memCards[idx]}');

    if (_memFirst == null) {
      _memFirst = idx;
      Future.delayed(const Duration(seconds: 1), () {
        VoiceService.speak('Say another card number.');
        _startListening();
      });
    } else {
      final first = _memFirst!;
      _memFirst = null;
      if (_memCards[first] == _memCards[idx] && first != idx) {
        _score += _difficulty * 10; _correct++;
        setState(() => _lastFeedback = true);
        VoiceService.speak('Match found!');
      } else {
        setState(() => _lastFeedback = false);
        VoiceService.speak('No match.');
        Future.delayed(const Duration(seconds: 1), () { if (mounted) setState(() { newRev[first] = false; newRev[idx] = false; }); });
      }
      // Check if all matched
      if (_correct >= _memCards.length ~/ 2) _finishGame();
      else Future.delayed(const Duration(seconds: 1), () { VoiceService.speak('Say another card.'); _startListening(); });
    }
  }

  int? _parseNumber(String text) {
    final n = int.tryParse(text.replaceAll(RegExp(r'[^0-9]'), ''));
    if (n != null) return n;
    const words = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8};
    for (final entry in words.entries) { if (text.contains(entry.key)) return entry.value; }
    return null;
  }

  String _emojiName(String emoji) {
    const map = {'🌸': 'flower', '🌺': 'hibiscus', '🌻': 'sunflower', '🌷': 'tulip', '🌹': 'rose',
      '🐘': 'elephant', '🐂': 'cow', '🦌': 'deer', '🐒': 'monkey', '🦜': 'parrot',
      '🍵': 'tea', '🍚': 'rice', '🥘': 'food', '🔴': 'red', '🔵': 'blue', '🟢': 'green',
      '⛰️': 'mountain', '🌊': 'water', '🌳': 'tree', '🍎': 'apple', '🍊': 'orange',
      '🐟': 'fish', '🐠': 'fish2', '🎵': 'music', '🎶': 'notes', '🐱': 'cat', '🐯': 'tiger'};
    return map[emoji] ?? '';
  }

  void _finishGame() async {
    _timerRef?.cancel();
    VoiceService.stopListening();
    final finalScore = _totalRounds > 0 ? (_correct / _totalRounds * 100).round() : 0;
    final gt = _selectedGame == 'pattern' ? GameType.patternRecognition
        : _selectedGame == 'attention' ? GameType.attentionFocus : GameType.memoryMatch;
    final session = GameSession(
      id: const Uuid().v4(), userId: 'patient-1', gameType: gt,
      difficulty: _difficulty, score: finalScore, maxScore: 100,
      accuracy: finalScore.toDouble(), timeSpent: _timer, completedAt: DateTime.now(),
    );
    await StorageService.saveSession(session);
    await AiEngine.updateAfterSession(session);
    VoiceService.speak('Game finished! You scored $finalScore percent.');
    setState(() { _gameOver = true; _score = finalScore; });
  }

  String _fmt(int s) => '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppState>().language;
    if (_selectedGame == null) return _buildMenu(lang);
    if (_gameOver) return _buildResult(lang);
    return _buildPlaying(lang);
  }

  Widget _buildMenu(String lang) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const Text('🗣️', style: TextStyle(fontSize: 72)),
          const SizedBox(height: 8),
          Text(L10n.t(lang, 'voiceGame'), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(L10n.t(lang, 'voiceGameDesc'), style: const TextStyle(fontSize: 18, color: AppTheme.textSecondary)),
          const SizedBox(height: 24),
          _menuCard('🧠', 'Memory Match', 'Remember and find card pairs by speaking', () => _startGame('memory')),
          _menuCard('🔍', 'Pattern Recognition', 'Listen to sequences and speak the answer', () => _startGame('pattern')),
          _menuCard('👁️', 'Attention Focus', 'Find the different item by saying its number', () => _startGame('attention')),
        ],
      ),
    );
  }

  Widget _menuCard(String icon, String title, String desc, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: onTap,
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(children: [
              Text(icon, style: const TextStyle(fontSize: 42)),
              const SizedBox(width: 16),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(desc, style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                ],
              )),
              const Icon(Icons.mic, color: AppTheme.primary, size: 28),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _buildPlaying(String lang) {
    final cols = _selectedGame == 'attention' ? (_attGrid.length <= 6 ? 3 : 3) : 4;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () { VoiceService.stopListening(); setState(() { _selectedGame = null; _gameOver = false; }); }),
        title: Text(_selectedGame == 'pattern' ? '🔍 Voice Pattern' : _selectedGame == 'attention' ? '👁️ Voice Attention' : '🧠 Voice Memory'),
        backgroundColor: AppTheme.primary, foregroundColor: Colors.white,
        actions: [TextButton(onPressed: _finishGame, child: const Text('Stop', style: TextStyle(color: Colors.white)))],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('Round $_round/$_totalRounds', style: const TextStyle(fontSize: 15)),
              Row(children: [
                Text('⏱ ${_fmt(_timer)}', style: const TextStyle(fontSize: 15)),
                const SizedBox(width: 12),
                Text('🎯 $_score pts', style: const TextStyle(fontSize: 15)),
              ]),
            ]),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: _round / _totalRounds),
            const SizedBox(height: 24),

            // Microphone button
            GestureDetector(
              onTap: () {
                if (_isListening) { VoiceService.stopListening(); setState(() => _isListening = false); }
                else _startListening();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: 100, height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _isListening ? AppTheme.danger : AppTheme.primary,
                  boxShadow: [BoxShadow(color: (_isListening ? AppTheme.danger : AppTheme.primary).withOpacity(0.4), blurRadius: _isListening ? 20 : 10, spreadRadius: _isListening ? 5 : 0)],
                ),
                child: Icon(_isListening ? Icons.stop : Icons.mic, color: Colors.white, size: 48),
              ),
            ),
            const SizedBox(height: 8),
            Text(_isListening ? L10n.t(lang, 'listening') : L10n.t(lang, 'tapToSpeak'),
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: _isListening ? AppTheme.danger : AppTheme.primary)),
            const SizedBox(height: 16),

            // Status
            if (_statusMsg.isNotEmpty) Container(
              width: double.infinity, padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _lastFeedback == true ? const Color(0xFFE8F5E9) : _lastFeedback == false ? const Color(0xFFFFEBEE) : Colors.white,
                borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border),
              ),
              child: Text(_statusMsg, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
            ),
            const SizedBox(height: 24),

            // Game-specific visuals
            if (_selectedGame == 'pattern' && _patternSeq.isNotEmpty) _buildPatternVisual(),
            if (_selectedGame == 'attention' && _attGrid.isNotEmpty) _buildAttentionVisual(cols),
            if (_selectedGame == 'memory' && _memCards.isNotEmpty) _buildMemoryVisual(),
          ],
        ),
      ),
    );
  }

  Widget _buildPatternVisual() {
    return Column(children: [
      const Text('Sequence:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      const SizedBox(height: 12),
      Wrap(spacing: 10, alignment: WrapAlignment.center, children: [
        ..._patternSeq.map((e) => Container(width: 64, height: 64, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border, width: 2)), child: Center(child: Text(e, style: const TextStyle(fontSize: 32))))),
        Container(width: 64, height: 64, decoration: BoxDecoration(color: const Color(0xFFF1F8E9), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border, width: 2)), child: const Center(child: Text('?', style: TextStyle(fontSize: 24, color: AppTheme.textMuted)))),
      ]),
      const SizedBox(height: 16),
      Text('🗣️ Say the answer or its number (1-${_patternOptions.length})', style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
    ]);
  }

  Widget _buildAttentionVisual(int cols) {
    return Column(children: [
      const Text('Find the different item!', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      const SizedBox(height: 4),
      Text('🗣️ Say the position number', style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
      const SizedBox(height: 12),
      GridView.builder(
        shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: cols, mainAxisSpacing: 8, crossAxisSpacing: 8),
        itemCount: _attGrid.length,
        itemBuilder: (_, i) => Container(
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border, width: 2)),
          child: Center(child: Stack(alignment: Alignment.bottomRight, children: [
            Text(_attGrid[i], style: const TextStyle(fontSize: 32)),
            Padding(padding: const EdgeInsets.all(4), child: Text('${i + 1}', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w700))),
          ])),
        ),
      ),
    ]);
  }

  Widget _buildMemoryVisual() {
    return Column(children: [
      const Text('Memory Match', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      const SizedBox(height: 4),
      Text('🗣️ Say "show" followed by a card number (1-${_memCards.length})', style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
      const SizedBox(height: 12),
      GridView.builder(
        shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 4, mainAxisSpacing: 8, crossAxisSpacing: 8),
        itemCount: _memCards.length,
        itemBuilder: (_, i) => Container(
          decoration: BoxDecoration(
            color: _memRevealed[i] ? Colors.white : const Color(0xFFE8F5E9),
            borderRadius: BorderRadius.circular(12), border: Border.all(color: _memRevealed[i] ? AppTheme.primary : AppTheme.border, width: 2),
          ),
          child: Center(child: Stack(alignment: Alignment.bottomRight, children: [
            Text(_memRevealed[i] ? _memCards[i] : '❓', style: TextStyle(fontSize: _memRevealed[i] ? 28 : 22)),
            if (!_memRevealed[i]) Padding(padding: const EdgeInsets.all(4), child: Text('${i + 1}', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w700))),
          ])),
        ),
      ),
    ]);
  }

  Widget _buildResult(String lang) {
    final pct = _totalRounds > 0 ? (_correct / _totalRounds * 100).round() : 0;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪', style: const TextStyle(fontSize: 64)),
              Text(L10n.t(lang, 'gameOver'), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('$_score', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w700, color: AppTheme.primary)),
              Text('$_correct/$_totalRounds correct', style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
              const SizedBox(height: 24),
              Row(children: [
                Expanded(child: ElevatedButton(onPressed: () { setState(() => _gameOver = false); _startGame(_selectedGame!); }, child: Text(L10n.t(lang, 'playAgain')))),
                const SizedBox(width: 12),
                Expanded(child: OutlinedButton(onPressed: () => setState(() { _selectedGame = null; _gameOver = false; }), child: Text(L10n.t(lang, 'back')))),
              ]),
            ]),
          ),
        ),
      ),
    );
  }
}
