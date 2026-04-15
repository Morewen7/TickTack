import React, {useState, useEffect, useRef} from 'react';
import {
  Alert, Modal, ScrollView, StatusBar, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GlassCard} from '../components/GlassCard';
import {store} from '../store/remindersStore';
import {useStore} from '../hooks/useStore';
import {Radius, Spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

interface Props {
  navigation: any;
}

const SETTINGS_KEY = '@ticktack_settings';
export type SortOption = 'date' | 'priority' | 'alphabet';

export interface Settings {
  notificationsSound: boolean;
  badgeCount: boolean;
  sortBy: SortOption;
  defaultTime: string;
}

const defaultSettings: Settings = {
  notificationsSound: true,
  badgeCount: true,
  sortBy: 'date',
  defaultTime: '09:00',
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return {...defaultSettings, ...JSON.parse(raw)};
  } catch {}
  return defaultSettings;
}

async function saveSettings(s: Settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

const SORT_OPTIONS: {value: SortOption; label: string}[] = [
  {value: 'date', label: 'По дате'},
  {value: 'priority', label: 'По приоритету'},
  {value: 'alphabet', label: 'По алфавиту'},
];

const LIST_COLORS = [
  '#ffffff', '#a3a3a3', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#3b82f6', '#a855f7',
];

export function SettingsScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {colors, mode, toggle} = useTheme();
  const {lists, reminders} = useStore();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showAddList, setShowAddList] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [timeHours, setTimeHours] = useState(9);
  const [timeMinutes, setTimeMinutes] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
    };
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0]);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = {...prev, ...patch};
      saveSettings(next);
      return next;
    });
  };

  const clearCompleted = () => {
    Alert.alert('Очистить выполненные?', 'Все выполненные напоминания будут удалены', [
      {text: 'Отмена', style: 'cancel'},
      {
        text: 'Очистить',
        style: 'destructive',
        onPress: () => {
          reminders.filter(r => r.completed).forEach(r => store.deleteReminder(r.id));
        },
      },
    ]);
  };

  const addList = () => {
    if (!newListName.trim()) return;
    store.addList(newListName.trim(), newListColor, 'list');
    setNewListName('');
    setNewListColor(LIST_COLORS[0]);
    setShowAddList(false);
  };

  const deleteList = (id: string) => {
    Alert.alert('Удалить список?', 'Напоминания из него останутся', [
      {text: 'Отмена', style: 'cancel'},
      {text: 'Удалить', style: 'destructive', onPress: () => store.deleteList(id)},
    ]);
  };

  const completedCount = reminders.filter(r => r.completed).length;

  const Row = ({label, right, onPress, borderBottom = true}: any) => {
    const Container = onPress ? TouchableOpacity : View;
    return (
      <Container
        style={[styles.row, borderBottom && {borderBottomWidth: 1, borderBottomColor: colors.separator}]}
        onPress={onPress}
        activeOpacity={0.6}>
        <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>{label}</Text>
        {right}
      </Container>
    );
  };

  return (
    <View style={[styles.bg, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl},
        ]}>

        <View style={styles.nav}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.navBack, {color: colors.textSecondary}]}>← Назад</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, {color: colors.textPrimary}]}>Настройки</Text>
          <View style={{width: 60}} />
        </View>

        {/* Внешний вид */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Внешний вид</Text>
        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Тёмная тема</Text>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggle}
              trackColor={{false: colors.switchTrack, true: colors.accent}}
              thumbColor="#ffffff"
            />
          </View>
        </GlassCard>

        {/* Уведомления */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Уведомления</Text>
        <GlassCard style={styles.card}>
          <View style={[styles.row, {borderBottomWidth: 1, borderBottomColor: colors.separator}]}>
            <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Звук уведомлений</Text>
            <Switch
              value={settings.notificationsSound}
              onValueChange={v => update({notificationsSound: v})}
              trackColor={{false: colors.switchTrack, true: colors.accent}}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[styles.row, {borderBottomWidth: 1, borderBottomColor: colors.separator}]}>
            <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Счётчик на иконке</Text>
            <Switch
              value={settings.badgeCount}
              onValueChange={v => update({badgeCount: v})}
              trackColor={{false: colors.switchTrack, true: colors.accent}}
              thumbColor="#ffffff"
            />
          </View>
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              const now = new Date();
              setTimeHours(now.getHours());
              setTimeMinutes(now.getMinutes());
              setEditingTime(true);
            }}>
            <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Время по умолчанию</Text>
            <Text style={[styles.rowValue, {color: colors.textSecondary}]}>{currentTime}</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Сортировка */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Сортировка</Text>
        <GlassCard style={styles.card}>
          {SORT_OPTIONS.map((opt, i) => (
            <Row
              key={opt.value}
              label={opt.label}
              borderBottom={i < SORT_OPTIONS.length - 1}
              onPress={() => update({sortBy: opt.value})}
              right={
                settings.sortBy === opt.value
                  ? <Text style={[styles.check, {color: colors.accent}]}>✓</Text>
                  : null
              }
            />
          ))}
        </GlassCard>

        {/* Списки */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Списки</Text>
        <GlassCard style={styles.card}>
          {lists.filter(l => l.id !== 'all').map((list, i, arr) => (
            <View
              key={list.id}
              style={[
                styles.row,
                i < arr.length - 1 && {borderBottomWidth: 1, borderBottomColor: colors.separator},
              ]}>
              <View style={styles.listRow}>
                <View style={[styles.listDot, {backgroundColor: list.color}]} />
                <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>{list.name}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteList(list.id)}>
                <Text style={[styles.deleteText, {color: colors.priorityHigh}]}>Удалить</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.row, {borderTopWidth: 1, borderTopColor: colors.separator}]}
            onPress={() => setShowAddList(true)}>
            <Text style={[styles.rowLabel, {color: colors.accent}]}>+ Новый список</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Данные */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Данные</Text>
        <GlassCard style={styles.card}>
          <Row
            label="Очистить выполненные"
            borderBottom={false}
            onPress={clearCompleted}
            right={
              <View style={[styles.badge, {backgroundColor: colors.bgSecondary}]}>
                <Text style={[styles.badgeText, {color: colors.textMuted}]}>{completedCount}</Text>
              </View>
            }
          />
        </GlassCard>
      </ScrollView>

      {/* Модал */}
      {/* Модал времени */}
      <Modal visible={editingTime} transparent animationType="slide">
        <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
          <GlassCard style={styles.modalCard}>
            <Text style={[styles.modalTitle, {color: colors.textPrimary}]}>Время по умолчанию</Text>

            <View style={styles.timePicker}>
              {/* Часы */}
              <View style={styles.timeColumn}>
                <TouchableOpacity
                  style={[styles.timeBtn, {backgroundColor: colors.bgSecondary}]}
                  onPress={() => setTimeHours(h => (h + 1) % 24)}>
                  <Text style={[styles.timeBtnText, {color: colors.textPrimary}]}>▲</Text>
                </TouchableOpacity>
                <View style={[styles.timeValueBox, {backgroundColor: colors.bgSecondary}]}>
                  <Text style={[styles.timeValue, {color: colors.textPrimary}]}>
                    {String(timeHours).padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.timeBtn, {backgroundColor: colors.bgSecondary}]}
                  onPress={() => setTimeHours(h => (h - 1 + 24) % 24)}>
                  <Text style={[styles.timeBtnText, {color: colors.textPrimary}]}>▼</Text>
                </TouchableOpacity>
                <Text style={[styles.timeLabel, {color: colors.textMuted}]}>часы</Text>
              </View>

              <Text style={[styles.timeSeparator, {color: colors.textPrimary}]}>:</Text>

              {/* Минуты */}
              <View style={styles.timeColumn}>
                <TouchableOpacity
                  style={[styles.timeBtn, {backgroundColor: colors.bgSecondary}]}
                  onPress={() => setTimeMinutes(m => (m + 1) % 60)}>
                  <Text style={[styles.timeBtnText, {color: colors.textPrimary}]}>▲</Text>
                </TouchableOpacity>
                <View style={[styles.timeValueBox, {backgroundColor: colors.bgSecondary}]}>
                  <Text style={[styles.timeValue, {color: colors.textPrimary}]}>
                    {String(timeMinutes).padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.timeBtn, {backgroundColor: colors.bgSecondary}]}
                  onPress={() => setTimeMinutes(m => (m - 1 + 60) % 60)}>
                  <Text style={[styles.timeBtnText, {color: colors.textPrimary}]}>▼</Text>
                </TouchableOpacity>
                <Text style={[styles.timeLabel, {color: colors.textMuted}]}>минуты</Text>
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, {backgroundColor: colors.bgSecondary}]}
                onPress={() => setEditingTime(false)}>
                <Text style={{color: colors.textSecondary, fontSize: 16}}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, {backgroundColor: colors.accent}]}
                onPress={() => {
                  const time = `${String(timeHours).padStart(2,'0')}:${String(timeMinutes).padStart(2,'0')}`;
                  update({defaultTime: time});
                  setEditingTime(false);
                }}>
                <Text style={{color: colors.bg, fontSize: 16, fontWeight: '700'}}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      <Modal visible={showAddList} transparent animationType="slide">
        <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
          <GlassCard style={styles.modalCard}>
            <Text style={[styles.modalTitle, {color: colors.textPrimary}]}>Новый список</Text>
            <TextInput
              style={[styles.modalInput, {color: colors.textPrimary, borderBottomColor: colors.separator}]}
              placeholder="Название списка"
              placeholderTextColor={colors.textMuted}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
            <View style={styles.colorPicker}>
              {LIST_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    {backgroundColor: c},
                    newListColor === c && {borderWidth: 2.5, borderColor: colors.textSecondary},
                  ]}
                  onPress={() => setNewListColor(c)}
                />
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, {backgroundColor: colors.bgSecondary}]}
                onPress={() => setShowAddList(false)}>
                <Text style={[{color: colors.textSecondary, fontSize: 16}]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, {backgroundColor: colors.accent}]}
                onPress={addList}>
                <Text style={[{color: colors.bg, fontSize: 16, fontWeight: '700'}]}>Создать</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {flex: 1},
  scroll: {paddingHorizontal: Spacing.md},
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  navBack: {fontSize: 16},
  navTitle: {fontSize: 17, fontWeight: '600'},
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {marginBottom: Spacing.lg},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  rowLabel: {fontSize: 16},
  rowValue: {fontSize: 16},
  check: {fontSize: 16, fontWeight: '600'},
  listRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  listDot: {width: 10, height: 10, borderRadius: 5},
  deleteText: {fontSize: 14},
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {fontSize: 14},
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  modalCard: {padding: Spacing.lg},
  modalTitle: {fontSize: 18, fontWeight: '700', marginBottom: Spacing.md},
  modalInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 8,
    marginBottom: Spacing.md,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
  },
  colorDot: {width: 30, height: 30, borderRadius: 15},
  modalBtns: {flexDirection: 'row', gap: Spacing.md},
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  timeColumn: {alignItems: 'center', gap: Spacing.sm},
  timeBtn: {
    width: 44,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {fontSize: 14},
  timeValueBox: {
    width: 72,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {fontSize: 32, fontWeight: '300', letterSpacing: 1},
  timeLabel: {fontSize: 12},
  timeSeparator: {fontSize: 32, fontWeight: '200', marginTop: -16},
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});
