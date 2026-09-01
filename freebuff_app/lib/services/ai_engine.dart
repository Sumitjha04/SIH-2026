import '../models/models.dart';
import 'storage_service.dart';

class AiEngine {
  static Future<int> calculateDifficulty(String gameType) async {
    final config = await StorageService.getDifficulty(gameType);
    final sessions = await StorageService.getRecentSessions(count: 20);
    final gameSessions = sessions.where((s) => s.gameType.name == gameType).toList();
    int level = config.currentLevel;

    if (gameSessions.isEmpty) return level;

    final recentAccs = gameSessions.take(5).map((s) => s.accuracy).toList();
    final avgAccuracy = recentAccs.reduce((a, b) => a + b) / recentAccs.length;

    // Improvement trend
    final mid = recentAccs.length ~/ 2;
    if (mid > 0) {
      final firstHalf = recentAccs.sublist(0, mid).reduce((a, b) => a + b) / mid;
      final secondHalf = recentAccs.sublist(mid).reduce((a, b) => a + b) / (recentAccs.length - mid);
      final trend = secondHalf - firstHalf;
      if (avgAccuracy > 80 && trend > 5) level = (level + 1).clamp(1, 10);
      else if (avgAccuracy > 90) level = (level + 1).clamp(1, 10);
      else if (avgAccuracy < 40) level = (level - 1).clamp(1, 10);
      else if (trend < -10) level = (level - 1).clamp(1, 10);
    }

    if (config.streakWrong >= 3) level = (level - 1).clamp(1, 10);
    if (config.streakCorrect >= 5 && level < 10) level = (level + 1).clamp(1, 10);

    config.currentLevel = level;
    await StorageService.saveDifficulty(config);
    return level;
  }

  static Future<void> updateAfterSession(GameSession session) async {
    final config = await StorageService.getDifficulty(session.gameType.name);
    if (session.accuracy >= 60) {
      config.streakCorrect += 1;
      config.streakWrong = 0;
    } else {
      config.streakWrong += 1;
      config.streakCorrect = 0;
    }
    config.recentScores = [...config.recentScores.take(9), session.accuracy];
    config.recentAccuracy = config.recentScores.reduce((a, b) => a + b) / config.recentScores.length;
    await StorageService.saveDifficulty(config);
  }

  static Future<CognitiveScores> getCognitiveScores() async {
    final sessions = await StorageService.getRecentSessions(count: 100);
    double mem = 50, att = 50, pat = 50, routine = 50;
    int memN = 0, attN = 0, patN = 0, routN = 0;
    for (final s in sessions) {
      switch (s.gameType) {
        case GameType.memoryMatch: mem += s.accuracy; memN++; break;
        case GameType.attentionFocus: att += s.accuracy; attN++; break;
        case GameType.patternRecognition: pat += s.accuracy; patN++; break;
        case GameType.dailyRoutine: routine += s.accuracy; routN++; break;
      }
    }
    return CognitiveScores(
      memory: memN > 0 ? mem / memN : 50,
      attention: attN > 0 ? att / attN : 50,
      pattern: patN > 0 ? pat / patN : 50,
      dailyRoutine: routN > 0 ? routine / routN : 50,
    );
  }

  static String getDifficultyReason(int level, double avgAccuracy) {
    if (avgAccuracy > 80 && level < 10) return 'Excellent performance — increasing challenge';
    if (avgAccuracy > 90) return 'Outstanding accuracy — level up!';
    if (avgAccuracy < 40) return 'Let us make it easier for you';
    if (avgAccuracy < 60) return 'Adjusting to your pace';
    return 'Maintaining current level';
  }
}

class CognitiveScores {
  final double memory;
  final double attention;
  final double pattern;
  final double dailyRoutine;
  double get overall => (memory + attention + pattern + dailyRoutine) / 4;

  CognitiveScores({
    required this.memory,
    required this.attention,
    required this.pattern,
    required this.dailyRoutine,
  });
}
