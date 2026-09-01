import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

class StorageService {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static SharedPreferences get prefs => _prefs!;

  // ---- Sessions ----
  static Future<List<GameSession>> getSessions() async {
    final raw = prefs.getString('sessions');
    if (raw == null) return [];
    return (jsonDecode(raw) as List).map((j) => GameSession.fromJson(j)).toList();
  }

  static Future<void> saveSession(GameSession session) async {
    final sessions = await getSessions();
    sessions.add(session);
    await prefs.setString('sessions', jsonEncode(sessions.map((s) => s.toJson()).toList()));
  }

  static Future<List<GameSession>> getRecentSessions({int count = 50}) async {
    final all = await getSessions();
    all.sort((a, b) => b.completedAt.compareTo(a.completedAt));
    return all.take(count).toList();
  }

  // ---- Difficulty Configs ----
  static Future<DifficultyConfig> getDifficulty(String gameType) async {
    final raw = prefs.getString('diff_$gameType');
    if (raw == null) return DifficultyConfig(gameType: gameType);
    return DifficultyConfig.fromJson(jsonDecode(raw));
  }

  static Future<void> saveDifficulty(DifficultyConfig config) async {
    await prefs.setString('diff_${config.gameType}', jsonEncode(config.toJson()));
  }

  // ---- Reminders ----
  static Future<List<Reminder>> getReminders() async {
    final raw = prefs.getString('reminders');
    if (raw == null) return [];
    return (jsonDecode(raw) as List).map((j) => Reminder.fromJson(j)).toList();
  }

  static Future<void> saveReminders(List<Reminder> reminders) async {
    await prefs.setString('reminders', jsonEncode(reminders.map((r) => r.toJson()).toList()));
  }

  // ---- Settings ----
  static String getLanguage() => prefs.getString('language') ?? 'en';
  static Future<void> setLanguage(String lang) => prefs.setString('language', lang);

  static double getFontSize() => prefs.getDouble('fontSize') ?? 18.0;
  static Future<void> setFontSize(double size) => prefs.setDouble('fontSize', size);

  static bool getVoiceEnabled() => prefs.getBool('voice') ?? true;
  static Future<void> setVoiceEnabled(bool v) => prefs.setBool('voice', v);

  static bool getSoundEnabled() => prefs.getBool('sound') ?? true;
  static Future<void> setSoundEnabled(bool v) => prefs.setBool('sound', v);
}
