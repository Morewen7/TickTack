import React, {useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
  FlatList,
} from 'react-native';
// DateTimePicker только на iOS — на Android несовместим с New Architecture
const DateTimePicker = Platform.OS === 'ios'
  ? require('@react-native-community/datetimepicker').default
  : null;
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

interface Template {
  emoji: string;
  title: string;
  note: string;
  priority: Priority;
  repeat: RepeatInterval;
  hour: number | null;
  minute: number | null;
}

const TEMPLATES: Template[] = [
  {emoji: '💪', title: 'Зарядка', note: '', priority: 'medium', repeat: 'daily', hour: 7, minute: 0},
  {emoji: '💧', title: 'Выпить воду', note: '8 стаканов в день', priority: 'low', repeat: 'daily', hour: 9, minute: 0},
  {emoji: '📧', title: 'Проверить почту', note: '', priority: 'medium', repeat: 'daily', hour: 10, minute: 0},
  {emoji: '🛒', title: 'Список покупок', note: '', priority: 'low', repeat: 'none', hour: null, minute: null},
  {emoji: '📊', title: 'Еженедельный отчёт', note: '', priority: 'high', repeat: 'weekly', hour: 17, minute: 0},
  {emoji: '🌙', title: 'Итоги дня', note: '', priority: 'low', repeat: 'daily', hour: 21, minute: 0},
  {emoji: '💊', title: 'Принять таблетку', note: '', priority: 'high', repeat: 'daily', hour: 8, minute: 0},
  {emoji: '📚', title: 'Читать 30 минут', note: '', priority: 'medium', repeat: 'daily', hour: 20, minute: 0},
];

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
  const [location, setLocation] = useState<ReminderLocation | undefined>(editReminder?.location);
  const [showTemplates, setShowTemplates] = useState(false);
  // Android custom picker state
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time' | 'repeat_time' | null>(null);
  const [pickerDay, setPickerDay] = useState(1);
  const [pickerMonth, setPickerMonth] = useState(0);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  // Время повтора (час и минута)
  const [repeatHour, setRepeatHour] = useState(
    editReminder?.dueDate ? new Date(editReminder.dueDate).getHours() : 9,
  );
  const [repeatMinute, setRepeatMinute] = useState(
    editReminder?.dueDate ? new Date(editReminder.dueDate).getMinutes() : 0,
  );

  const applyTemplate = (t: Template) => {
    setTitle(t.title);
    setNote(t.note);
    setPriority(t.priority);
    setRepeat(t.repeat);
    if (t.hour !== null && t.minute !== null) {
      setRepeatHour(t.hour);
      setRepeatMinute(t.minute);
      // Устанавливаем дату на сегодня с нужным временем
      const d = new Date();
      d.setHours(t.hour, t.minute, 0, 0);
      // Если время уже прошло сегодня — ставим на завтра
      if (d <= new Date()) { d.setDate(d.getDate() + 1); }
      setDueDate(d);
      setHasDate(true);
    }
    setShowTemplates(false);
    haptics.success();
  };

  const openAndroidDatePicker = () => {
    const d = dueDate ?? new Date();
    setPickerDay(d.getDate());
    setPickerMonth(d.getMonth());
    setPickerYear(d.getFullYear());
    setAndroidPickerMode('date');
  };

  const openAndroidTimePicker = () => {
    const d = dueDate ?? new Date();
    setPickerHour(d.getHours());
    setPickerMinute(d.getMinutes());
    setAndroidPickerMode('time');
  };

  const openRepeatTimePicker = () => {
    setPickerHour(repeatHour);
    setPickerMinute(repeatMinute);
    setAndroidPickerMode('repeat_time');
  };

  const confirmAndroidPicker = () => {
    if (androidPickerMode === 'date') {
      setDueDate(prev => {
        const next = new Date(prev ?? new Date());
        next.setFullYear(pickerYear, pickerMonth, pickerDay);
        return next;
      });
    } else if (androidPickerMode === 'time') {
      setDueDate(prev => {
        const next = new Date(prev ?? new Date());
        next.setHours(pickerHour, pickerMinute);
        return next;
      });
    } else if (androidPickerMode === 'repeat_time') {
      setRepeatHour(pickerHour);
      setRepeatMinute(pickerMinute);
    }
    setAndroidPickerMode(null);
  };

  const MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();

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

  const handleSave = () => {
    if (!title.trim()) return;
    haptics.success();

    // Если выбран повтор — применяем время повтора к dueDate,
    // но только если пользователь оставил переключатель "Напомнить" включённым
    let finalDueDate = hasDate ? dueDate : null;
    if (repeat !== 'none' && hasDate) {
      const base = dueDate ?? new Date();
      const next = new Date(base);
      next.setHours(repeatHour, repeatMinute, 0, 0);
      finalDueDate = next;
    }

    if (isEditing) {
      store.updateReminder(editReminder.id, {
        title: title.trim(),
        note,
        priority,
        dueDate: finalDueDate ? finalDueDate.toISOString() : null,
        repeat,
        subtasks,
        location,
      });
      // Перепланируем или отменяем уведомление
      import('../utils/notifications').then(async ({scheduleNotification, cancelNotification}) => {
        await cancelNotification(editReminder.id);
        if (finalDueDate) {
          const updated = {...editReminder, title: title.trim(), note, dueDate: finalDueDate.toISOString(), repeat};
          await scheduleNotification(updated);
        }
      });
    } else {
      store.addReminder({
        title: title.trim(),
        note,
        listId: listId ?? 'personal',
        priority,
        dueDate: finalDueDate ? finalDueDate.toISOString() : null,
        repeat,
        subtasks,
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 100},
          ]}>
          {/* Nav */}
          <View style={styles.nav}>
            <TouchableOpacity
              style={[styles.navIconBtn, {backgroundColor: colors.bgSecondary, borderColor: colors.cardBorder}]}
              onPress={() => navigation.goBack()}>
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { haptics.light(); setShowTemplates(true); }}>
              <Text style={[styles.navTitle, {color: colors.textPrimary}]}>
                {isEditing ? 'Редактировать' : 'Новое ⚡'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navIconBtn, {
                backgroundColor: title.trim() ? colors.accent : colors.bgSecondary,
                borderColor: title.trim() ? colors.accent : colors.cardBorder,
              }]}
              onPress={handleSave}
              disabled={!title.trim()}>
              <Icon name="checkmark" size={18} color={title.trim() ? colors.bg : colors.textMuted} />
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
              blurOnSubmit={false}
              returnKeyType="default"
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
                {Platform.OS === 'ios' ? (
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
                ) : (
                  <View style={styles.pickerRow}>
                    <TouchableOpacity
                      style={[styles.androidPickerBtn, {borderColor: colors.cardBorder, backgroundColor: colors.bgSecondary}]}
                      onPress={openAndroidDatePicker}>
                      <Icon name="calendar-outline" size={15} color={colors.accent} />
                      <Text style={[styles.androidPickerText, {color: colors.textPrimary}]}>
                        {dueDate.toLocaleDateString('ru-RU')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.androidPickerBtn, {borderColor: colors.cardBorder, backgroundColor: colors.bgSecondary}]}
                      onPress={openAndroidTimePicker}>
                      <Icon name="time-outline" size={15} color={colors.accent} />
                      <Text style={[styles.androidPickerText, {color: colors.textPrimary}]}>
                        {dueDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
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
            {repeat !== 'none' && (
              <>
                <View style={[styles.divider, {backgroundColor: colors.separator}]} />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Время повтора</Text>
                  {Platform.OS === 'ios' && DateTimePicker ? (
                    <DateTimePicker
                      value={(() => { const d = new Date(); d.setHours(repeatHour, repeatMinute, 0, 0); return d; })()}
                      mode="time"
                      display="compact"
                      onChange={(_, date) => {
                        if (date) {
                          setRepeatHour(date.getHours());
                          setRepeatMinute(date.getMinutes());
                        }
                      }}
                      themeVariant={colors.blurType === 'dark' ? 'dark' : 'light'}
                      style={styles.picker}
                    />
                  ) : (
                    <TouchableOpacity style={styles.repeatTimeBtn} onPress={openRepeatTimePicker}>
                      <Icon name="time-outline" size={15} color={colors.accent} />
                      <Text style={[styles.repeatTimeText, {color: colors.accent}]}>
                        {`${String(repeatHour).padStart(2, '0')}:${String(repeatMinute).padStart(2, '0')}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
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

      {/* Шаблоны напоминаний */}
      <Modal visible={showTemplates} transparent animationType="slide">
        <View style={[styles.androidModalOverlay, {backgroundColor: colors.overlay}]}>
          <GlassCard style={[styles.androidModalCard, {backgroundColor: colors.card}]}>
            <Text style={[styles.androidModalTitle, {color: colors.textPrimary}]}>Шаблоны</Text>
            <FlatList
              data={TEMPLATES}
              keyExtractor={item => item.title}
              numColumns={2}
              columnWrapperStyle={styles.templateGrid}
              style={{maxHeight: 320}}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[styles.templateCard, {backgroundColor: colors.bgSecondary, borderColor: colors.cardBorder}]}
                  onPress={() => applyTemplate(item)}>
                  <Text style={styles.templateEmoji}>{item.emoji}</Text>
                  <Text style={[styles.templateTitle, {color: colors.textPrimary}]}>{item.title}</Text>
                  <Text style={[styles.templateMeta, {color: colors.textMuted}]}>
                    {item.repeat === 'none' ? 'разово' : item.repeat === 'daily' ? 'ежедневно' : item.repeat === 'weekly' ? 'еженедельно' : 'ежемесячно'}
                    {item.hour !== null ? ` · ${String(item.hour).padStart(2,'0')}:${String(item.minute!).padStart(2,'0')}` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.androidModalBtn, {backgroundColor: colors.bgSecondary, marginTop: Spacing.md}]}
              onPress={() => setShowTemplates(false)}>
              <Text style={{color: colors.textSecondary, fontSize: 16}}>Отмена</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      {/* Android custom date/time picker modal */}
      {Platform.OS === 'android' && (
        <Modal visible={androidPickerMode !== null} transparent animationType="slide">
          <View style={[styles.androidModalOverlay, {backgroundColor: colors.overlay}]}>
            <GlassCard style={[styles.androidModalCard, {backgroundColor: colors.card}]}>
              <Text style={[styles.androidModalTitle, {color: colors.textPrimary}]}>
                {androidPickerMode === 'date' ? 'Выбери дату' : androidPickerMode === 'repeat_time' ? 'Время повтора' : 'Выбери время'}
              </Text>

              {androidPickerMode === 'date' ? (
                <View style={styles.androidPickerRow}>
                  {/* День */}
                  <View style={styles.androidPickerCol}>
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerDay(d => d < daysInMonth ? d + 1 : 1)}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▲</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.androidPickerValue, styles.androidValueInput, {backgroundColor: colors.bgSecondary, color: colors.textPrimary}]}
                      value={String(pickerDay)}
                      onChangeText={val => { const n = parseInt(val, 10); if (!isNaN(n) && n >= 1 && n <= daysInMonth) setPickerDay(n); }}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerDay(d => d > 1 ? d - 1 : daysInMonth)}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▼</Text>
                    </TouchableOpacity>
                    <Text style={[styles.androidColLabel, {color: colors.textMuted}]}>день</Text>
                  </View>

                  {/* Месяц */}
                  <View style={styles.androidPickerCol}>
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerMonth(m => (m + 1) % 12)}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▲</Text>
                    </TouchableOpacity>
                    <View style={[styles.androidPickerValue, {backgroundColor: colors.bgSecondary}]}>
                      <Text style={[styles.androidValueTextSm, {color: colors.textPrimary}]}>{MONTHS[pickerMonth]}</Text>
                    </View>
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerMonth(m => (m - 1 + 12) % 12)}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▼</Text>
                    </TouchableOpacity>
                    <Text style={[styles.androidColLabel, {color: colors.textMuted}]}>месяц</Text>
                  </View>

                  {/* Год */}
                  <View style={styles.androidPickerCol}>
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerYear(y => y + 1)}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▲</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.androidPickerValue, styles.androidValueInput, {backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontSize: 20}]}
                      value={String(pickerYear)}
                      onChangeText={val => { const n = parseInt(val, 10); if (!isNaN(n) && n >= new Date().getFullYear() && n <= 2099) setPickerYear(n); }}
                      keyboardType="number-pad"
                      maxLength={4}
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerYear(y => Math.max(new Date().getFullYear(), y - 1))}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▼</Text>
                    </TouchableOpacity>
                    <Text style={[styles.androidColLabel, {color: colors.textMuted}]}>год</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.androidPickerRow}>
                  {/* Час */}
                  <View style={styles.androidPickerCol}>
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerHour(h => (h + 1) % 24)}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▲</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.androidPickerValue, styles.androidValueInput, {backgroundColor: colors.bgSecondary, color: colors.textPrimary}]}
                      value={String(pickerHour)}
                      onChangeText={val => { const n = parseInt(val, 10); if (!isNaN(n) && n >= 0 && n <= 23) setPickerHour(n); }}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerHour(h => (h - 1 + 24) % 24)}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▼</Text>
                    </TouchableOpacity>
                    <Text style={[styles.androidColLabel, {color: colors.textMuted}]}>часы</Text>
                  </View>

                  <Text style={[styles.androidTimeSep, {color: colors.textPrimary}]}>:</Text>

                  {/* Минуты */}
                  <View style={styles.androidPickerCol}>
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerMinute(m => (m + 1) % 60)}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▲</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.androidPickerValue, styles.androidValueInput, {backgroundColor: colors.bgSecondary, color: colors.textPrimary}]}
                      value={String(pickerMinute)}
                      onChangeText={val => { const n = parseInt(val, 10); if (!isNaN(n) && n >= 0 && n <= 59) setPickerMinute(n); }}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={[styles.androidPickerArrow, {backgroundColor: colors.bgSecondary}]}
                      onPress={() => setPickerMinute(m => (m - 1 + 60) % 60)}>
                      <Text style={[styles.androidArrowText, {color: colors.textPrimary}]}>▼</Text>
                    </TouchableOpacity>
                    <Text style={[styles.androidColLabel, {color: colors.textMuted}]}>минуты</Text>
                  </View>
                </View>
              )}

              <View style={styles.androidModalBtns}>
                <TouchableOpacity
                  style={[styles.androidModalBtn, {backgroundColor: colors.bgSecondary}]}
                  onPress={() => setAndroidPickerMode(null)}>
                  <Text style={{color: colors.textSecondary, fontSize: 16}}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.androidModalBtn, {backgroundColor: colors.accent}]}
                  onPress={() => { Keyboard.dismiss(); confirmAndroidPicker(); }}>
                  <Text style={{color: colors.bg, fontSize: 16, fontWeight: '700'}}>Готово</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </Modal>
      )}
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
  navIconBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  navTitle: {fontSize: 17, fontWeight: '600'},
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
  divider: {height: 1, marginHorizontal: Spacing.md},
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  picker: {flex: 1},
  androidPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  androidPickerText: {fontSize: 14, fontWeight: '500'},
  androidModalOverlay: {
    flex: 1, justifyContent: 'center', padding: Spacing.lg,
  },
  androidModalCard: {padding: Spacing.lg},
  androidModalTitle: {fontSize: 18, fontWeight: '700', marginBottom: Spacing.lg, textAlign: 'center'},
  androidPickerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.lg,
  },
  androidPickerCol: {alignItems: 'center', gap: 6},
  androidPickerArrow: {
    width: 48, height: 36, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  androidArrowText: {fontSize: 14},
  androidPickerValue: {
    width: 64, height: 52, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  androidValueText: {fontSize: 26, fontWeight: '300'},
  androidValueTextSm: {fontSize: 18, fontWeight: '400'},
  androidValueInput: {fontSize: 26, fontWeight: '300', textAlign: 'center', padding: 0},
  androidColLabel: {fontSize: 11, marginTop: 2},
  androidTimeSep: {fontSize: 28, fontWeight: '200', marginBottom: 24},
  repeatTimeBtn: {flexDirection: 'row', alignItems: 'center', gap: 5},
  repeatTimeText: {fontSize: 16, fontWeight: '600'},
  androidModalBtns: {flexDirection: 'row', gap: Spacing.md},
  androidModalBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: Radius.md, alignItems: 'center',
  },
  templateGrid: {gap: Spacing.sm, marginBottom: Spacing.sm},
  templateCard: {
    flex: 1, borderRadius: Radius.md, borderWidth: 1,
    padding: Spacing.md, alignItems: 'center', gap: 4,
  },
  templateEmoji: {fontSize: 26},
  templateTitle: {fontSize: 13, fontWeight: '600', textAlign: 'center'},
  templateMeta: {fontSize: 11, textAlign: 'center'},
});
