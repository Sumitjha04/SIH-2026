import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'services/app_state.dart';
import 'services/storage_service.dart';
import 'services/l10n.dart';
import 'screens/home_screen.dart';
import 'screens/games_screen.dart';
import 'screens/voice_game_screen.dart';
import 'screens/reminders_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/settings_screen.dart';
import 'games/memory_match_game.dart';
import 'games/pattern_game.dart';
import 'games/routine_game.dart';
import 'games/attention_game.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const FreebuffApp());
}

class FreebuffApp extends StatelessWidget {
  const FreebuffApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState()..load(),
      child: Consumer<AppState>(
        builder: (ctx, state, _) {
          return MaterialApp(
            title: 'Freebuff',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.theme,
            home: const MainShell(),
            routes: {
              '/memory': (_) => const MemoryMatchGame(),
              '/pattern': (_) => const PatternGame(),
              '/routine': (_) => const RoutineGame(),
              '/attention': (_) => const AttentionGame(),
              '/voice': (_) => const VoiceGameScreen(),
            },
          );
        },
      ),
    );
  }
}

class MainShell extends StatelessWidget {
  const MainShell({super.key});

  static const _screens = [
    HomeScreen(),
    GamesScreen(),
    RemindersScreen(),
    DashboardScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final lang = state.language;

    return Scaffold(
      body: _screens[state.currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: state.currentIndex,
        onDestinationSelected: (i) => state.setTabIndex(i),
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFE8F5E9),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home), label: L10n.t(lang, 'home')),
          NavigationDestination(icon: const Icon(Icons.games_outlined), selectedIcon: const Icon(Icons.games), label: L10n.t(lang, 'games')),
          NavigationDestination(icon: const Icon(Icons.alarm_outlined), selectedIcon: const Icon(Icons.alarm), label: L10n.t(lang, 'reminders')),
          NavigationDestination(icon: const Icon(Icons.bar_chart_outlined), selectedIcon: const Icon(Icons.bar_chart), label: L10n.t(lang, 'dashboard')),
          NavigationDestination(icon: const Icon(Icons.settings_outlined), selectedIcon: const Icon(Icons.settings), label: L10n.t(lang, 'settings')),
        ],
      ),
    );
  }
}
