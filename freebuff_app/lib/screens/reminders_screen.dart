import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../services/app_state.dart';
import '../services/l10n.dart';
import '../services/storage_service.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

const _typeIcons = {ReminderType.medicine: '💊', ReminderType.hydration: '💧', ReminderType.activity: '🚶', ReminderType.appointment: '🏥'};
const _typeColors = {ReminderType.medicine: Color(0xFFE3F2FD), ReminderType.hydration: Color(0xFFE0F7FA), ReminderType.activity: Color(0xFFE8F5E9), ReminderType.appointment: Color(0xFFFFF3E0)};
const _dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

class RemindersScreen extends StatefulWidget {
  const RemindersScreen({super.key});
  @override
  State<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends State<RemindersScreen> {
  List<Reminder> _reminders = [];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final r = await StorageService.getReminders();
    if (mounted) setState(() => _reminders = r);
  }

  void _toggle(Reminder r) async {
    r.enabled = !r.enabled;
    await StorageService.saveReminders(_reminders);
    setState(() {});
  }

  void _delete(String id) async {
    _reminders.removeWhere((r) => r.id == id);
    await StorageService.saveReminders(_reminders);
    setState(() {});
  }

  void _addOrEdit({Reminder? existing}) async {
    final result = await showDialog<Reminder>(context: context, builder: (_) => _ReminderDialog(existing: existing));
    if (result == null) return;
    if (existing != null) {
      final idx = _reminders.indexWhere((r) => r.id == existing.id);
      if (idx >= 0) _reminders[idx] = result;
    } else {
      _reminders.add(result);
    }
    await StorageService.saveReminders(_reminders);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<AppState>().language;
    final grouped = ReminderType.values.map((t) => (type: t, items: _reminders.where((r) => r.type == t).toList())).where((g) => g.items.isNotEmpty);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('⏰ ${L10n.t(lang, 'reminders')}', style: Theme.of(context).textTheme.headlineSmall),
            ElevatedButton.icon(onPressed: () => _addOrEdit(), icon: const Icon(Icons.add), label: Text(L10n.t(lang, 'addReminder'))),
          ]),
          const SizedBox(height: 16),
          if (_reminders.isEmpty) Card(child: Padding(
            padding: const EdgeInsets.all(32),
            child: Center(child: Text(L10n.t(lang, 'noReminders'), style: const TextStyle(fontSize: 18, color: AppTheme.textMuted))),
          )),
          ...grouped.map((g) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${_typeIcons[g.type]} ${L10n.t(lang, g.type.name)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...g.items.map((r) => Card(
                child: ListTile(
                  leading: CircleAvatar(backgroundColor: _typeColors[r.type], child: Text(_typeIcons[r.type]!, style: const TextStyle(fontSize: 22))),
                  title: Text(r.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(r.description, style: const TextStyle(fontSize: 13)),
                      const SizedBox(height: 4),
                      Wrap(spacing: 4, children: _dayNames.asMap().entries.map((e) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: r.days.contains(e.key) ? AppTheme.primary : AppTheme.borderLight,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(e.value, style: TextStyle(fontSize: 10, color: r.days.contains(e.key) ? Colors.white : AppTheme.textMuted, fontWeight: FontWeight.w600)),
                      )).toList()),
                    ],
                  ),
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(r.time, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                    const SizedBox(width: 8),
                    Switch(value: r.enabled, onChanged: (_) => _toggle(r), activeColor: AppTheme.primary),
                  ]),
                ),
              )),
              const SizedBox(height: 16),
            ],
          )),
        ],
      ),
    );
  }
}

class _ReminderDialog extends StatefulWidget {
  final Reminder? existing;
  const _ReminderDialog({this.existing});
  @override
  State<_ReminderDialog> createState() => _ReminderDialogState();
}

class _ReminderDialogState extends State<_ReminderDialog> {
  late ReminderType _type;
  late TextEditingController _titleCtrl;
  late TextEditingController _descCtrl;
  TimeOfDay _time = const TimeOfDay(hour: 8, minute: 0);
  List<int> _days = [0,1,2,3,4,5,6];

  @override
  void initState() {
    super.initState();
    _type = widget.existing?.type ?? ReminderType.medicine;
    _titleCtrl = TextEditingController(text: widget.existing?.title ?? '');
    _descCtrl = TextEditingController(text: widget.existing?.description ?? '');
    if (widget.existing != null) {
      final parts = widget.existing!.time.split(':');
      _time = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
      _days = List<int>.from(widget.existing!.days);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.existing != null ? '✏️ Edit Reminder' : '➕ Add Reminder'),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField<ReminderType>(
            value: _type,
            items: ReminderType.values.map((t) => DropdownMenuItem(value: t, child: Text('${_typeIcons[t]} ${L10n.t(context.read<AppState>().language, t.name)}'))).toList(),
            onChanged: (v) => setState(() => _type = v!),
          ),
          const SizedBox(height: 12),
          TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          ListTile(
            leading: const Icon(Icons.access_time),
            title: Text('Time: ${_time.format(context)}'),
            onTap: () async {
              final t = await showTimePicker(context: context, initialTime: _time);
              if (t != null) setState(() => _time = t);
            },
          ),
          Wrap(spacing: 6, children: _dayNames.asMap().entries.map((e) => FilterChip(
            label: Text(e.value),
            selected: _days.contains(e.key),
            onSelected: (sel) => setState(() { sel ? _days.add(e.key) : _days.remove(e.key); }),
            selectedColor: AppTheme.primary,
            labelStyle: TextStyle(color: _days.contains(e.key) ? Colors.white : null),
          )).toList()),
        ]),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(onPressed: () {
          if (_titleCtrl.text.isEmpty) return;
          final r = Reminder(
            id: widget.existing?.id ?? const Uuid().v4(), userId: 'patient-1', type: _type,
            title: _titleCtrl.text, description: _descCtrl.text,
            time: '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}',
            days: _days, enabled: widget.existing?.enabled ?? true,
          );
          Navigator.pop(context, r);
        }, child: const Text('Save')),
      ],
    );
  }
}
