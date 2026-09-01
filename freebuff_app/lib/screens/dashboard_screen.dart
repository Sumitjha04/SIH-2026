import 'dart:math';
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/ai_engine.dart';
import '../services/storage_service.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

const _gameIcons = {GameType.memoryMatch: '🃏', GameType.patternRecognition: '🔍', GameType.dailyRoutine: '📋', GameType.attentionFocus: '👁️'};
const _gameNames = {GameType.memoryMatch: 'Memory Match', GameType.patternRecognition: 'Pattern', GameType.dailyRoutine: 'Routine', GameType.attentionFocus: 'Attention'};

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  CognitiveScores? _scores;
  List<GameSession> _sessions = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final scores = await AiEngine.getCognitiveScores();
    final sessions = await StorageService.getRecentSessions(count: 100);
    if (mounted) setState(() { _scores = scores; _sessions = sessions; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final scores = _scores!;

    // Weekly data
    final weeklyData = List.generate(7, (i) {
      final date = DateTime.now().subtract(Duration(days: 6 - i));
      final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      final daySessions = _sessions.where((s) => s.completedAt.toIso8601String().startsWith(dateStr)).toList();
      final avg = daySessions.isNotEmpty ? daySessions.map((s) => s.accuracy).reduce((a, b) => a + b) / daySessions.length : 0.0;
      return _WeeklyData(date.weekday, avg, daySessions.length);
    });

    // Game performance
    final gamePerf = GameType.values.map((gt) {
      final accs = _sessions.where((s) => s.gameType == gt).map((s) => s.accuracy).toList();
      final avg = accs.isNotEmpty ? accs.reduce((a, b) => a + b) / accs.length : 0.0;
      return _GamePerf(gt, avg, accs.length);
    }).where((g) => g.count > 0).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('📊 Dashboard', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text("Dai Aunto's cognitive health overview", style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),

          // Summary cards
          Row(children: [
            _summaryCard('🧠', scores.overall.round().toString(), 'Cognitive Score', AppTheme.primary),
            _summaryCard('🎮', _sessions.length.toString(), 'Sessions', AppTheme.secondary),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            _summaryCard('📅', _sessions.where((s) => s.completedAt.day == DateTime.now().day).length.toString(), 'Today', AppTheme.accent),
            _summaryCard('⏰', '4', 'Reminders', Colors.deepPurple),
          ]),
          const SizedBox(height: 24),

          // Weekly Progress Chart
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('📈 Weekly Progress', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                SizedBox(height: 200, child: LineChart(LineChartData(
                  gridData: FlGridData(show: true, drawVerticalLine: false, horizontalInterval: 25),
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30)),
                    bottomTitles: AxisTitles(sideTitles: SideTitles(
                      showTitles: true, reservedSize: 30,
                      getTitlesWidget: (v, _) {
                        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                        final idx = v.toInt() - 1;
                        return Text(idx >= 0 && idx < 7 ? days[idx] : '', style: const TextStyle(fontSize: 11));
                      },
                    )),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [LineChartBarData(
                    spots: weeklyData.asMap().entries.map((e) => FlSpot(e.key + 1, e.value.accuracy)).toList(),
                    isCurved: true, color: AppTheme.primary, barWidth: 3,
                    dotData: FlDotData(show: true, getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(radius: 4, color: AppTheme.primary)),
                  )],
                  minY: 0, maxY: 100,
                ))),
              ],
            ),
          )),
          const SizedBox(height: 16),

          // Radar chart for cognitive scores
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🧠 Cognitive Score', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                SizedBox(height: 220, child: RadarChart(RadarChartData(
                  radarShape: RadarShape.polygon,
                  borderData: FlBorderData(show: false),
                  titlePositionPercentageOffset: 0.15,
                  radarTouchData: RadarTouchData(enabled: false),
                  getTitle: (i, _) {
                    const labels = ['Memory', 'Attention', 'Pattern', 'Routine'];
                    return RadarChartTitle(text: i < labels.length ? labels[i] : '');
                  },
                  dataSets: [RadarDataSet(
                    dataEntries: [
                      RadarEntry(value: scores.memory),
                      RadarEntry(value: scores.attention),
                      RadarEntry(value: scores.pattern),
                      RadarEntry(value: scores.dailyRoutine),
                    ],
                    borderColor: AppTheme.primary,
                    borderWidth: 2,
                  )],
                ))),
              ],
            ),
          )),
          const SizedBox(height: 16),

          // Game Performance Bar Chart
          if (gamePerf.isNotEmpty) Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🎮 Game Performance', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
                SizedBox(height: 200, child: BarChart(BarChartData(
                  gridData: const FlGridData(show: false),
                  titlesData: FlTitlesData(
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    leftTitles: AxisTitles(sideTitles: SideTitles(
                      showTitles: true, reservedSize: 30,
                      getTitlesWidget: (v, _) => Text('${v.toInt()}%', style: const TextStyle(fontSize: 11)),
                    )),
                    bottomTitles: AxisTitles(sideTitles: SideTitles(
                      showTitles: true, reservedSize: 30,
                      getTitlesWidget: (v, _) {
                        final idx = v.toInt();
                        return idx >= 0 && idx < gamePerf.length
                            ? Text(_gameIcons[gamePerf[idx].type] ?? '', style: const TextStyle(fontSize: 18))
                            : const Text('');
                      },
                    )),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: gamePerf.asMap().entries.map((e) => BarChartGroupData(
                    x: e.key, barRods: [BarChartRodData(toY: e.value.accuracy, color: AppTheme.primary, width: 32, borderRadius: const BorderRadius.vertical(top: Radius.circular(6)))],
                  )).toList(),
                  maxY: 100,
                ))),
              ],
            ),
          )),
          const SizedBox(height: 16),

          // Score cards
          Row(children: [
            _scoreDetail('🧩', 'Memory', scores.memory, AppTheme.primary),
            _scoreDetail('👁️', 'Attention', scores.attention, Colors.blue),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            _scoreDetail('🔍', 'Pattern', scores.pattern, Colors.deepPurple),
            _scoreDetail('📋', 'Routine', scores.dailyRoutine, Colors.orange),
          ]),
          const SizedBox(height: 16),

          // AI Insights
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('💡 AI Performance Insights', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                _insight('Average Accuracy', '${scores.overall.round()}%', const Color(0xFFE8F5E9)),
                _insight('Total Sessions', '${_sessions.length}', const Color(0xFFE3F2FD)),
                if (_sessions.isNotEmpty) _insight('Best Game', _gameNames[_sessions.fold<GameType>(_sessions.first.gameType, (best, s) => s.accuracy > (_sessions.where((x) => x.gameType == best).map((x) => x.accuracy).fold<double>(0, (a, b) => max(a, b))) ? s.gameType : best)] ?? '', const Color(0xFFF3E5F5)),
              ],
            ),
          )),
          const SizedBox(height: 16),

          // Activity log
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('📝 Activity Log', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                if (_sessions.isEmpty) const Text('No recent activity', style: TextStyle(color: AppTheme.textMuted)),
                ..._sessions.take(10).map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(children: [
                    Text(_gameIcons[s.gameType] ?? '🎮', style: const TextStyle(fontSize: 24)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_gameNames[s.gameType] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                        Text('Lvl ${s.difficulty} • ${_timeAgo(s.completedAt)}', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                      ],
                    )),
                    Text('${s.accuracy.round()}%', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: s.accuracy >= 70 ? AppTheme.success : s.accuracy >= 40 ? AppTheme.warning : AppTheme.danger)),
                  ]),
                )),
              ],
            ),
          )),
        ],
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays == 1) return 'Yesterday';
    return '${diff.inDays}d ago';
  }

  Widget _summaryCard(String icon, String value, String label, Color color) {
    return Expanded(child: Card(child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        Text(icon, style: const TextStyle(fontSize: 28)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: color)),
        Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
      ]),
    )));
  }

  Widget _scoreDetail(String icon, String label, double value, Color color) {
    return Expanded(child: Card(child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(children: [
        Text(icon, style: const TextStyle(fontSize: 24)),
        Text(value.round().toString(), style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: color)),
        Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        const SizedBox(height: 4),
        LinearProgressIndicator(value: value / 100, backgroundColor: AppTheme.borderLight, color: color, minHeight: 4),
      ]),
    )));
  }

  Widget _insight(String label, String value, Color bg) {
    return Container(
      width: double.infinity, margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
      child: RichText(text: TextSpan(children: [
        TextSpan(text: '$label: ', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
        TextSpan(text: value, style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
      ])),
    );
  }
}

class _WeeklyData { final int weekday; final double accuracy; final int count; _WeeklyData(this.weekday, this.accuracy, this.count); }
class _GamePerf { final GameType type; final double accuracy; final int count; _GamePerf(this.type, this.accuracy, this.count); }
