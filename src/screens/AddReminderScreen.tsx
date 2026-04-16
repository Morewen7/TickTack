import React, {useState} from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassCard} from '../components/GlassCard';
import {Priority, RepeatInterval, ReminderLocation, store, SubTask} from '../store/remindersStore';
import Icon from 'react-native-vector-icons/Ionicons';
import {haptics} from '../utils/haptics';
import {Radius, Spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import uuid from 'react-native-uuid';

interface Props {
  navigation: any;
  route: any;
}

const PRIORITIES: {value: Priority; label: string}[] = [
  {value: 'low', label: 'Низкий'},
  {value: 'medium', label: 'Средний'},
  {value: 'high', label: 'Высокий'},
];

const REPEATS: {value: RepeatInterval; label: string}[] = [
  {value: 'none', label: 'Нет'},
  {value: 'daily', label: 'Каждый день'},
  {value: 'weekly', label: 'Каждую неделю'},
  {value: 'monthly', label: 'Каждый месяц'},
];

export function AddReminderScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const {colors, mode} = useTheme();
  const {listId, reminder: editReminder} = route.params ?? {};
  const isEditing = !!editReminder;

  const [title, setTitle] = useState(editReminder?.title ?? '');
  const [note, setNote] = useState(editReminder?.note ?? '');
  const [priority, setPriority] = useState<Priority>(editReminder?.priority ?? 'medium');
  const [repeat, setRepeat] = useState<RepeatInterval>(editReminder?.repeat ?? 'none');
  const [hasDate, setHasDate] = useState(!!editReminder?.dueDate);
  const [dueDate, setDueDate] = useState<Date | null>(
    editReminder?.dueDate ? new Date(editReminder.dueDate) : null,
  );
  const [subtasks, setSubtasks] = useState<SubTask[]>(editReminder?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState('');
  const [tags, setTags] = useState<string[]>(editReminder?.tags ?? []);
  const [newTag, setNewTag] = useState('');
  const [location, setLocation] = useState<ReminderLocation | undefined>(editReminder?.location);

  const handleDateToggle = (val: boolean) => {
    setHasDate(val);
    if (val) {
      setDueDate(new Date());
    } else {
      setDueDate(null);
    }
  };

  const PRIORITY_COLOR = {
    high: colors.priorityHigh,
    medium: colors.priorityMedium,
    low: colors.priorityLow,
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [
      ...prev,
      {id: uuid.v4() as string, title: newSubtask.trim(), completed: false},
    ]);
    setNewSubtask('');
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase().replace(/\s+/g, '_');
    if (!tag || tags.includes(tag)) { setNewTag(''); return; }
    setTags(prev => [...prev, tag]);
    setNewTag('');
  };

  const handleSave = () => {
    if (!title.trim()) return;
    haptics.success();
    if (isEditing) {
      store.updateReminder(editReminder.id, {
        title: title.trim(),
        note,
        priority,
        dueDate: dueDate ? dueDate.toISOString() : null,
        repeat,
        subtasks,
        tags,
        location,
      });
      // Перепланируем уведомление
      if (dueDate) {
        const updated = {...editReminder, title: title.trim(), note, dueDate: dueDate.toISOString(), repeat};
        import('../utils/notifications').then(({scheduleNotification, cancelNotification}) => {
          cancelNotification(editReminder.id);
          scheduleNotification(updated);
        });
      }
    } else {
      store.addReminder({
        title: title.trim(),
        note,
        listId: listId ?? 'personal',
        priority,
        dueDate: dueDate ? dueDate.toISOString() : null,
        repeat,
        subtasks,
        tags,
        location,
        completed: false,
        archived: false,
      });
    }
    navigation.goBack();
  };

  return (
    <View style={[styles.bg, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 100},
          ]}>
          {/* Nav */}
          <View style={styles.nav}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.navCancel, {color: colors.textSecondary}]}>Отмена</Text>
            </TouchableOpacity>
            <Text style={[styles.navTitle, {color: colors.textPrimary}]}>{isEditing ? 'Редактировать' : 'Новое'}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.navSave, {color: colors.accent}, !title.trim() && styles.navSaveDisabled]}>
                {isEditing ? 'Сохранить' : 'Добавить'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Title & Note */}
          <GlassCard style={styles.card}>
            <TextInput
              style={[styles.titleInput, {color: colors.textPrimary}]}
              placeholder="Название"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
              returnKeyType="next"
            />
            <View style={[styles.separator, {backgroundColor: colors.separator}]} />
            <TextInput
              style={[styles.noteInput, {color: colors.textSecondary}]}
              placeholder="Заметка"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </GlassCard>

          {/* Priority */}
          <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Приоритет</Text>
          <GlassCard style={styles.card}>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityBtn,
                    {borderColor: colors.cardBorder, backgroundColor: colors.bgSecondary},
                    priority === p.value && {
                      backgroundColor: PRIORITY_COLOR[p.value] + '22',
                      borderColor: PRIORITY_COLOR[p.value],
                    },
                  ]}
                  onPress={() => setPriority(p.value)}>
                  <View style={[styles.dot, {backgroundColor: PRIORITY_COLOR[p.value]}]} />
                  <Text style={[styles.priorityLabel, {color: colors.textPrimary}]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* Date */}
          <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Дата и время</Text>
          <GlassCard style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Напомнить</Text>
              <Switch
                value={hasDate}
                onValueChange={handleDateToggle}
                trackColor={{false: colors.switchTrack, true: colors.accent}}
                thumbColor="#ffffff"
              />
            </View>
            {hasDate && dueDate && (
              <>
                <View style={[styles.divider, {backgroundColor: colors.separator}]} />
                <View style={styles.pickerRow}>
                  <DateTimePicker
                    value={dueDate}
                    mode="date"
                    display="compact"
                    onChange={(_, date) => date && setDueDate(prev => {
                      const next = new Date(prev!);
                      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      return next;
                    })}
                    themeVariant={colors.blurType === 'dark' ? 'dark' : 'light'}
                    style={styles.picker}
                  />
                  <DateTimePicker
                    value={dueDate}
                    mode="time"
                    display="compact"
                    onChange={(_, date) => date && setDueDate(prev => {
                      const next = new Date(prev!);
                      next.setHours(date.getHours(), date.getMinutes());
                      return next;
                    })}
                    themeVariant={colors.blurType === 'dark' ? 'dark' : 'light'}
                    style={styles.picker}
                  />
                </View>
              </>
            )}
          </GlassCard>

          {/* Repeat */}
          <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Повторение</Text>
          <GlassCard style={styles.card}>
            {REPEATS.map((r, i) => (
              <Pressable
                key={r.value}
                style={[styles.row, i < REPEATS.length - 1 && {borderBottomWidth: 1, borderBottomColor: colors.separator}]}
                onPress={() => setRepeat(r.value)}>
                <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>{r.label}</Text>
                {repeat === r.value && (
                  <Text style={[styles.check, {color: colors.accent}]}>✓</Text>
                )}
              </Pressable>
            ))}
          </GlassCard>

          {/* Tags */}
          <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Теги</Text>
          <GlassCard style={styles.card}>
            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, {backgroundColor: colors.accent + '18', borderColor: colors.accent + '44'}]}
                    onPress={() => setTags(prev => prev.filter(t => t !== tag))}>
                    <Text style={[styles.tagText, {color: colors.accent}]}>#{tag}</Text>
                    <Icon name="close" size={11} color={colors.accent} style={{opacity: 0.6}} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.addSubtaskRow}>
              <TextInput
                style={[styles.subtaskInput, {color: colors.textPrimary}]}
                placeholder="Добавить тег"
                placeholderTextColor={colors.textMuted}
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={addTag}
                returnKeyType="done"
                autoCapitalize="none"
              />
              {newTag.length > 0 && (
                <TouchableOpacity onPress={addTag}>
                  <Text style={[styles.addBtn, {color: colors.accent}]}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>

          {/* Location */}
          <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Напомнить по месту</Text>
          <GlassCard style={styles.card}>
            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => navigation.navigate('LocationPicker', {onSave: setLocation})}>
              <Icon name="location-outline" size={18} color={location ? colors.accent : colors.textMuted} />
              <Text style={[styles.locationText, {color: location ? colors.accent : colors.textMuted}]}>
                {location ? `${location.name} · ${location.radius}м · ${location.onArrive ? 'при прибытии' : 'при отъезде'}` : 'Добавить место'}
              </Text>
              {location && (
                <TouchableOpacity onPress={() => setLocation(undefined)}>
                  <Icon name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </GlassCard>

          {/* Subtasks */}
          <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Подзадачи</Text>
          <GlassCard style={styles.card}>
            {subtasks.map(s => (
              <View key={s.id} style={[styles.subtaskRow, {borderBottomColor: colors.separator}]}>
                <View style={[styles.subtaskBullet, {backgroundColor: colors.accent}]} />
                <Text style={[styles.subtaskTitle, {color: colors.textPrimary}]}>{s.title}</Text>
                <TouchableOpacity onPress={() => setSubtasks(prev => prev.filter(x => x.id !== s.id))}>
                  <Text style={[styles.removeBtn, {color: colors.textMuted}]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addSubtaskRow}>
              <TextInput
                style={[styles.subtaskInput, {color: colors.textPrimary}]}
                placeholder="Добавить подзадачу"
                placeholderTextColor={colors.textMuted}
                value={newSubtask}
                onChangeText={setNewSubtask}
                onSubmitEditing={addSubtask}
                returnKeyType="done"
              />
              {newSubtask.length > 0 && (
                <TouchableOpacity onPress={addSubtask}>
                  <Text style={[styles.addBtn, {color: colors.accent}]}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {flex: 1},
  kav: {flex: 1},
  scroll: {paddingHorizontal: Spacing.md},
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  navCancel: {fontSize: 16},
  navTitle: {fontSize: 17, fontWeight: '600'},
  navSave: {fontSize: 16, fontWeight: '600'},
  navSaveDisabled: {opacity: 0.35},
  card: {marginBottom: Spacing.md},
  separator: {height: 1, marginHorizontal: Spacing.md},
  titleInput: {fontSize: 17, paddingHorizontal: Spacing.md, paddingVertical: 14},
  noteInput: {fontSize: 15, paddingHorizontal: Spacing.md, paddingVertical: 14, minHeight: 60},
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  priorityRow: {flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm},
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  dot: {width: 8, height: 8, borderRadius: 4},
  priorityLabel: {fontSize: 13},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  rowLabel: {fontSize: 16},
  check: {fontSize: 16, fontWeight: '600'},
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  locationText: {flex: 1, fontSize: 15},
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  subtaskBullet: {width: 6, height: 6, borderRadius: 3},
  subtaskTitle: {flex: 1, fontSize: 15},
  removeBtn: {fontSize: 14, padding: 4},
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  subtaskInput: {flex: 1, fontSize: 15},
  addBtn: {fontSize: 24, paddingHorizontal: Spacing.sm},
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tagText: {fontSize: 13, fontWeight: '500'},
  divider: {height: 1, marginHorizontal: Spacing.md},
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  picker: {flex: 1},
});
