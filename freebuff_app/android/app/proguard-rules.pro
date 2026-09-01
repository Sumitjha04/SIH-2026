# ==========================================
# Freebuff App — ProGuard / R8 Rules
# ==========================================

# ---- Keep Flutter & Dart entry points ----
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# ---- Speech & TTS plugins ----
-keep class com.tundralabs.fluttertts.** { *; }
-keep class com.csdcorp.speech_to_text.** { *; }

# ---- SharedPreferences ----
-keep class io.flutter.plugins.sharedpreferences.** { *; }

# ---- Path Provider ----
-keep class io.flutter.plugins.pathprovider.** { *; }

# ---- Provider state management ----
-keep class ** extends change_notifier { *; }
-keep class ** extends **change_notifier** { *; }

# ---- Remove logging in release ----
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# ---- Optimize ----
-optimizationpasses 5
-allowaccessmodification
-dontpreverify
-repackageclasses ''
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# ---- Play Core / SplitCompat classes (missing from R8) ----
-dontwarn com.google.android.play.core.splitcompat.**
-dontwarn com.google.android.play.core.splitinstall.**
-dontwarn com.google.android.play.core.tasks.**
-keep class com.google.android.play.core.splitcompat.** { *; }
-keep class com.google.android.play.core.splitinstall.** { *; }
-keep class com.google.android.play.core.tasks.** { *; }

# ---- Remove debug info ----
-renamesourcefileattribute SourceFile
