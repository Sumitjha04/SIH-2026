import 'package:flutter/material.dart';
import 'storage_service.dart';

class AppState extends ChangeNotifier {
  String _language = 'en';
  double _fontSize = 18.0;
  bool _voiceEnabled = true;
  bool _soundEnabled = true;
  int _currentIndex = 0;

  String get language => _language;
  double get fontSize => _fontSize;
  bool get voiceEnabled => _voiceEnabled;
  bool get soundEnabled => _soundEnabled;
  int get currentIndex => _currentIndex;

  void load() {
    _language = StorageService.getLanguage();
    _fontSize = StorageService.getFontSize();
    _voiceEnabled = StorageService.getVoiceEnabled();
    _soundEnabled = StorageService.getSoundEnabled();
    notifyListeners();
  }

  Future<void> setLanguage(String lang) async {
    _language = lang;
    await StorageService.setLanguage(lang);
    notifyListeners();
  }

  Future<void> setFontSize(double size) async {
    _fontSize = size;
    await StorageService.setFontSize(size);
    notifyListeners();
  }

  Future<void> setVoiceEnabled(bool v) async {
    _voiceEnabled = v;
    await StorageService.setVoiceEnabled(v);
    notifyListeners();
  }

  Future<void> setSoundEnabled(bool v) async {
    _soundEnabled = v;
    await StorageService.setSoundEnabled(v);
    notifyListeners();
  }

  void setTabIndex(int i) {
    _currentIndex = i;
    notifyListeners();
  }
}
