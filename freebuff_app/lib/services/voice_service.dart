import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

class VoiceService {
  static final FlutterTts _tts = FlutterTts();
  static final SpeechToText _stt = SpeechToText();
  static bool _sttInitialized = false;

  static Future<void> speak(String text, {double rate = 0.8}) async {
    await _tts.setLanguage('en-IN');
    await _tts.setSpeechRate(rate);
    await _tts.setVolume(1.0);
    await _tts.setPitch(1.0);
    await _tts.speak(text);
  }

  static Future<void> stop() async {
    await _tts.stop();
  }

  static Future<bool> initSpeech() async {
    if (_sttInitialized) return _stt.isAvailable;
    _sttInitialized = true;
    return await _stt.initialize();
  }

  static void startListening({
    required void Function(String text, bool isFinal) onResult,
    String localeId = 'en_IN',
  }) {
    _stt.listen(
      onResult: (result) {
        onResult(result.recognizedWords, result.finalResult);
      },
      localeId: localeId,
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
    );
  }

  static void stopListening() {
    _stt.stop();
  }

  static bool get isListening => _stt.isListening;
}
