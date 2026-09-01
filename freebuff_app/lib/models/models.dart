enum GameType { memoryMatch, patternRecognition, dailyRoutine, attentionFocus }

enum CognitiveLevel { mild, moderate, severe }

enum ReminderType { medicine, hydration, activity, appointment }

class GameSession {
  final String id;
  final String userId;
  final GameType gameType;
  final int difficulty;
  final int score;
  final int maxScore;
  final double accuracy;
  final int timeSpent;
  final DateTime completedAt;
  final int hintsUsed;

  GameSession({
    required this.id,
    required this.userId,
    required this.gameType,
    required this.difficulty,
    required this.score,
    required this.maxScore,
    required this.accuracy,
    required this.timeSpent,
    required this.completedAt,
    this.hintsUsed = 0,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'userId': userId, 'gameType': gameType.index,
    'difficulty': difficulty, 'score': score, 'maxScore': maxScore,
    'accuracy': accuracy, 'timeSpent': timeSpent,
    'completedAt': completedAt.toIso8601String(), 'hintsUsed': hintsUsed,
  };

  factory GameSession.fromJson(Map<String, dynamic> j) => GameSession(
    id: j['id'], userId: j['userId'],
    gameType: GameType.values[j['gameType']],
    difficulty: j['difficulty'], score: j['score'], maxScore: j['maxScore'],
    accuracy: (j['accuracy'] as num).toDouble(), timeSpent: j['timeSpent'],
    completedAt: DateTime.parse(j['completedAt']), hintsUsed: j['hintsUsed'] ?? 0,
  );
}

class Reminder {
  final String id;
  final String userId;
  final ReminderType type;
  final String title;
  final String description;
  final String time;
  final List<int> days;
  bool enabled;

  Reminder({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    required this.description,
    required this.time,
    required this.days,
    this.enabled = true,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'userId': userId, 'type': type.index,
    'title': title, 'description': description, 'time': time,
    'days': days, 'enabled': enabled,
  };

  factory Reminder.fromJson(Map<String, dynamic> j) => Reminder(
    id: j['id'], userId: j['userId'],
    type: ReminderType.values[j['type']],
    title: j['title'], description: j['description'], time: j['time'],
    days: List<int>.from(j['days']), enabled: j['enabled'] ?? true,
  );
}

class DifficultyConfig {
  final String gameType;
  int currentLevel;
  double recentAccuracy;
  List<double> recentScores;
  int streakCorrect;
  int streakWrong;

  DifficultyConfig({
    required this.gameType,
    this.currentLevel = 3,
    this.recentAccuracy = 0,
    this.recentScores = const [],
    this.streakCorrect = 0,
    this.streakWrong = 0,
  });

  Map<String, dynamic> toJson() => {
    'gameType': gameType, 'currentLevel': currentLevel,
    'recentAccuracy': recentAccuracy, 'recentScores': recentScores,
    'streakCorrect': streakCorrect, 'streakWrong': streakWrong,
  };

  factory DifficultyConfig.fromJson(Map<String, dynamic> j) => DifficultyConfig(
    gameType: j['gameType'], currentLevel: j['currentLevel'] ?? 3,
    recentAccuracy: (j['recentAccuracy'] as num?)?.toDouble() ?? 0,
    recentScores: (j['recentScores'] as List?)?.map((e) => (e as num).toDouble()).toList() ?? [],
    streakCorrect: j['streakCorrect'] ?? 0, streakWrong: j['streakWrong'] ?? 0,
  );
}
