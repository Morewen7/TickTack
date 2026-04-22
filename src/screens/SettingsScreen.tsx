import React, {useState, useEffect} from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  Alert, Image, Modal, ScrollView, Share, StatusBar, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';
import {GlassCard} from '../components/GlassCard';
import {store} from '../store/remindersStore';
import {useStore} from '../hooks/useStore';
import {Radius, Spacing} from '../theme';
import {useTheme, ACCENT_COLORS} from '../theme/ThemeContext';
import {useLock} from '../hooks/useLock';

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

const LIST_ICONS = [
  {name: 'list', label: '≡'},
  {name: 'person', label: '♟'},
  {name: 'briefcase-outline', label: '💼'},
  {name: 'cart-outline', label: '🛒'},
  {name: 'heart-outline', label: '♡'},
  {name: 'star-outline', label: '☆'},
  {name: 'home-outline', label: '⌂'},
  {name: 'fitness-outline', label: '◎'},
  {name: 'book-outline', label: '▣'},
  {name: 'airplane-outline', label: '✈'},
];

export function SettingsScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {colors, mode, toggle, backgroundImage, setBackgroundImage, accentColor, setAccentColor} = useTheme();
  const {lockEnabled, enableLock} = useLock();
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const pickBackgroundImage = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, copyTo: 'documentDirectory'},
      response => {
        if (response.didCancel || response.errorCode) return;
        // Используем copyTo URI — постоянный путь в Documents, не очищается iOS
        const uri = response.assets?.[0]?.uri ?? null;
        if (uri) setBackgroundImage(uri);
      },
    );
  };
  const {lists, reminders} = useStore();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showAddList, setShowAddList] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [timeHours, setTimeHours] = useState(9);
  const [timeMinutes, setTimeMinutes] = useState(0);
  // Сохранённое время по умолчанию для уведомлений
  const defaultTimeDisplay = settings.defaultTime || '09:00';
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0]);
  const [newListIcon, setNewListIcon] = useState(LIST_ICONS[0].name);

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
          reminders.filter(r => r.completed && !r.archived).forEach(r => store.deleteReminder(r.id));
        },
      },
    ]);
  };

  const addList = () => {
    if (!newListName.trim()) return;
    store.addList(newListName.trim(), newListColor, newListIcon);
    setNewListName('');
    setNewListColor(LIST_COLORS[0]);
    setNewListIcon(LIST_ICONS[0].name);
    setShowAddList(false);
  };

  const deleteList = (id: string) => {
    Alert.alert('Удалить список?', 'Напоминания из него останутся', [
      {text: 'Отмена', style: 'cancel'},
      {text: 'Удалить', style: 'destructive', onPress: () => store.deleteList(id)},
    ]);
  };

  const handleExport = () => {
    Alert.alert('Формат экспорта', 'JSON — полный бэкап с импортом обратно.\nCSV — таблица для Excel/Google Sheets.', [
      {
        text: 'JSON (бэкап)',
        onPress: async () => {
          const json = store.exportData();
          await Share.share({message: json, title: 'TickTack backup.json'});
        },
      },
      {
        text: 'CSV (таблица)',
        onPress: async () => {
          const csv = store.exportDataCSV();
          await Share.share({message: csv, title: 'TickTack data.csv'});
        },
      },
      {text: 'Отмена', style: 'cancel'},
    ]);
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    const result = await store.importData(importText.trim());
    setShowImport(false);
    setImportText('');
    if (result.error) {
      Alert.alert('Ошибка', result.error);
    } else {
      Alert.alert('Готово', `Импортировано ${result.imported} напоминаний`);
    }
  };

  const completedCount = reminders.filter(r => r.completed && !r.archived).length;

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
          <View style={[styles.row, {borderBottomWidth: 1, borderBottomColor: colors.separator}]}>
            <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Тёмная тема</Text>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggle}
              trackColor={{false: colors.switchTrack, true: colors.accent}}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[styles.row, {borderBottomWidth: 1, borderBottomColor: colors.separator, flexDirection: 'column', alignItems: 'flex-start', paddingVertical: Spacing.md}]}>
            <Text style={[styles.rowLabel, {color: colors.textPrimary, marginBottom: Spacing.sm}]}>Цвет акцента</Text>
            <View style={styles.accentRow}>
              {ACCENT_COLORS.map(({color}) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.accentDot,
                    {backgroundColor: color},
                    accentColor === color && styles.accentDotActive,
                  ]}
                  onPress={() => setAccentColor(color)}
                />
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.row} onPress={pickBackgroundImage}>
            <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Фото на фон</Text>
            <View style={styles.bgPreviewRow}>
              {backgroundImage ? (
                <>
                  <Image source={{uri: backgroundImage}} style={styles.bgThumb} />
                  <TouchableOpacity onPress={() => setBackgroundImage(null)}>
                    <Text style={[styles.bgRemove, {color: colors.priorityHigh}]}>Убрать</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[styles.rowValue, {color: colors.textSecondary}]}>Выбрать</Text>
              )}
            </View>
          </TouchableOpacity>
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
              const [h, m] = (settings.defaultTime || '09:00').split(':').map(Number);
              setTimeHours(h);
              setTimeMinutes(m);
              setEditingTime(true);
            }}>
            <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Время по умолчанию</Text>
            <Text style={[styles.rowValue, {color: colors.textSecondary}]}>{defaultTimeDisplay}</Text>
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
                {list.private && (
                  <Icon name="lock-closed" size={13} color={colors.textMuted} style={{marginLeft: 4}} />
                )}
              </View>
              <View style={styles.listRowActions}>
                <TouchableOpacity
                  onPress={() => store.updateList(list.id, {private: !list.private})}
                  style={{marginRight: 12}}>
                  <Icon
                    name={list.private ? 'lock-closed' : 'lock-open-outline'}
                    size={18}
                    color={list.private ? colors.accent : colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteList(list.id)}>
                  <Text style={[styles.deleteText, {color: colors.priorityHigh}]}>Удалить</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.row, {borderTopWidth: 1, borderTopColor: colors.separator}]}
            onPress={() => setShowAddList(true)}>
            <Text style={[styles.rowLabel, {color: colors.accent}]}>+ Новый список</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Безопасность */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Безопасность</Text>
        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Face ID / Touch ID</Text>
            <Switch
              value={lockEnabled}
              onValueChange={enableLock}
              trackColor={{false: colors.switchTrack, true: colors.accent}}
              thumbColor="#ffffff"
            />
          </View>
        </GlassCard>

        {/* Данные */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Данные</Text>
        <GlassCard style={styles.card}>
          <Row
            label="Архив"
            borderBottom
            onPress={() => navigation.navigate('Archive')}
            right={
              <View style={[styles.badge, {backgroundColor: colors.bgSecondary}]}>
                <Text style={[styles.badgeText, {color: colors.textMuted}]}>
                  {reminders.filter(r => r.archived).length}
                </Text>
              </View>
            }
          />
          <Row
            label={`Очистить выполненные (${completedCount})`}
            borderBottom
            onPress={completedCount > 0 ? clearCompleted : undefined}
            right={<Text style={[styles.rowValue, {color: completedCount > 0 ? colors.priorityHigh : colors.textMuted}]}>Удалить</Text>}
          />
          <Row
            label="Экспорт данных"
            borderBottom
            onPress={handleExport}
            right={<Text style={[styles.rowValue, {color: colors.textSecondary}]}>JSON / CSV</Text>}
          />
          <Row
            label="Импорт данных"
            borderBottom
            onPress={() => setShowImport(true)}
            right={<Text style={[styles.rowValue, {color: colors.textSecondary}]}>Вставить</Text>}
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

      <Modal visible={showImport} transparent animationType="slide">
        <View style={[styles.modalOverlay, {backgroundColor: colors.overlay}]}>
          <GlassCard style={styles.modalCard}>
            <Text style={[styles.modalTitle, {color: colors.textPrimary}]}>Импорт данных</Text>
            <Text style={[styles.importHint, {color: colors.textMuted}]}>
              Вставь JSON из экспорта TickTack
            </Text>
            <TextInput
              style={[styles.importInput, {color: colors.textPrimary, backgroundColor: colors.bgSecondary, borderColor: colors.cardBorder}]}
              placeholder="Вставь JSON сюда..."
              placeholderTextColor={colors.textMuted}
              value={importText}
              onChangeText={setImportText}
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, {backgroundColor: colors.bgSecondary}]}
                onPress={() => { setShowImport(false); setImportText(''); }}>
                <Text style={{color: colors.textSecondary, fontSize: 16}}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, {backgroundColor: colors.accent}]}
                onPress={handleImport}>
                <Text style={{color: colors.bg, fontSize: 16, fontWeight: '700'}}>Импорт</Text>
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
            <Text style={[styles.modalSubtitle, {color: colors.textMuted}]}>Иконка</Text>
            <View style={styles.colorPicker}>
              {LIST_ICONS.map(({name, label}) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.iconBtn,
                    {backgroundColor: newListIcon === name ? colors.accent + '33' : colors.bgSecondary,
                     borderColor: newListIcon === name ? colors.accent : colors.cardBorder},
                  ]}
                  onPress={() => setNewListIcon(name)}>
                  <Icon name={name} size={18} color={newListIcon === name ? colors.accent : colors.textMuted} />
                </TouchableOpacity>
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
  listRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1},
  listRowActions: {flexDirection: 'row', alignItems: 'center'},
  listDot: {width: 10, height: 10, borderRadius: 5},
  deleteText: {fontSize: 14},
  importHint: {fontSize: 13, marginBottom: Spacing.sm},
  importInput: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    fontSize: 13, minHeight: 120, textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  accentRow: {flexDirection: 'row', gap: 10, flexWrap: 'wrap'},
  accentDot: {width: 32, height: 32, borderRadius: 16},
  accentDotActive: {borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)', transform: [{scale: 1.15}]},
  bgPreviewRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  bgThumb: {width: 36, height: 36, borderRadius: 6},
  bgRemove: {fontSize: 14},
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {fontSize: 14},
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 120,
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
  modalSubtitle: {fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4},
  iconBtn: {width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
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
