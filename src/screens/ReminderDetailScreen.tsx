import React, {useEffect} from 'react';
import {
  Alert, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassCard} from '../components/GlassCard';
import {useStore} from '../hooks/useStore';
import {store} from '../store/remindersStore';
import {Radius, Spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {haptics} from '../utils/haptics';

interface Props {
  navigation: any;
  route: any;
}

const PRIORITY_LABEL = {high: 'Высокий', medium: 'Средний', low: 'Низкий'};
const REPEAT_LABEL = {
  none: 'Нет',
  daily: 'Каждый день',
  weekly: 'Каждую неделю',
  monthly: 'Каждый месяц',
};

export function ReminderDetailScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const {colors, mode} = useTheme();
  const {reminderId} = route.params;
  const {reminders} = useStore();
  const reminder = reminders.find(r => r.id === reminderId);

  useEffect(() => {
    if (!reminder) {
      navigation.goBack();
    }
  }, [reminder, navigation]);

  if (!reminder) {
    return null;
  }

  const PRIORITY_COLOR = {
    high: colors.priorityHigh,
    medium: colors.priorityMedium,
    low: colors.priorityLow,
  };

  const handleDelete = () => {
    Alert.alert('Удалить?', 'Это действие нельзя отменить', [
      {text: 'Отмена', style: 'cancel'},
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          store.deleteReminder(reminderId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleArchive = () => {
    store.archiveReminder(reminderId);
    navigation.goBack();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    });

  return (
    <View style={[styles.bg, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl},
        ]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBackBtn}>
            <Icon name="chevron-back" size={18} color={colors.textSecondary} />
            <Text style={[styles.navBack, {color: colors.textSecondary}]}>Назад</Text>
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity
              style={[styles.navIconBtn, {backgroundColor: colors.bgSecondary, borderColor: colors.cardBorder}]}
              onPress={() => navigation.push('AddReminder', {reminder})}>
              <Icon name="pencil-outline" size={16} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navIconBtn, {backgroundColor: colors.bgSecondary, borderColor: colors.cardBorder}]}
              onPress={handleArchive}>
              <Icon name="archive-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navIconBtn, {backgroundColor: colors.bgSecondary, borderColor: colors.cardBorder}]}
              onPress={handleDelete}>
              <Icon name="trash-outline" size={16} color={colors.priorityHigh} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              {borderColor: PRIORITY_COLOR[reminder.priority]},
              reminder.completed && {backgroundColor: PRIORITY_COLOR[reminder.priority]},
            ]}
            onPress={() => { haptics.success(); store.toggleReminder(reminder.id); }}>
            {reminder.completed && (
              <Text style={[styles.checkmark, {color: colors.bg}]}>✓</Text>
            )}
          </TouchableOpacity>
          <Text
            style={[
              styles.title,
              {color: colors.textPrimary},
              reminder.completed && styles.titleCompleted,
            ]}>
            {reminder.title}
          </Text>
        </View>

        {reminder.note ? (
          <Text style={[styles.note, {color: colors.textSecondary}]}>{reminder.note}</Text>
        ) : null}

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Приоритет</Text>
            <View style={styles.priorityBadge}>
              <View style={[styles.dot, {backgroundColor: PRIORITY_COLOR[reminder.priority]}]} />
              <Text style={[styles.infoValue, {color: PRIORITY_COLOR[reminder.priority]}]}>
                {PRIORITY_LABEL[reminder.priority]}
              </Text>
            </View>
          </View>

          {reminder.dueDate && (
            <>
              <View style={[styles.divider, {backgroundColor: colors.separator}]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Дата</Text>
                <Text style={[styles.infoValue, {color: colors.textPrimary}]}>
                  {formatDate(reminder.dueDate)}
                </Text>
              </View>
            </>
          )}

          {reminder.repeat !== 'none' && (
            <>
              <View style={[styles.divider, {backgroundColor: colors.separator}]} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Повтор</Text>
                <Text style={[styles.infoValue, {color: colors.textPrimary}]}>
                  {REPEAT_LABEL[reminder.repeat]}
                </Text>
              </View>
            </>
          )}
        </GlassCard>

        {reminder.subtasks.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>
              Подзадачи ({reminder.subtasks.filter(s => s.completed).length}/{reminder.subtasks.length})
            </Text>
            <GlassCard style={styles.infoCard}>
              {reminder.subtasks.map((s, i) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.subtaskRow,
                    i < reminder.subtasks.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.separator,
                    },
                  ]}
                  onPress={() => store.toggleSubtask(reminder.id, s.id)}>
                  <View
                    style={[
                      styles.subtaskCheck,
                      {borderColor: colors.accent},
                      s.completed && {backgroundColor: colors.accent},
                    ]}>
                    {s.completed && (
                      <Text style={[styles.subtaskCheckmark, {color: colors.bg}]}>✓</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.subtaskTitle,
                      {color: colors.textPrimary},
                      s.completed && styles.subtaskDone,
                    ]}>
                    {s.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </GlassCard>
          </>
        )}
      </ScrollView>
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
    marginBottom: Spacing.xl,
  },
  navBackBtn: {flexDirection: 'row', alignItems: 'center', gap: 2},
  navBack: {fontSize: 15},
  navRight: {flexDirection: 'row', gap: Spacing.sm, alignItems: 'center'},
  navIconBtn: {
    width: 34, height: 34, borderRadius: Radius.full,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  checkmark: {fontSize: 13, fontWeight: '600'},
  title: {flex: 1, fontSize: 26, fontWeight: '700', lineHeight: 32},
  titleCompleted: {opacity: 0.35, textDecorationLine: 'line-through'},
  note: {fontSize: 15, lineHeight: 22, marginBottom: Spacing.sm},
  infoCard: {marginBottom: Spacing.md},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  infoLabel: {fontSize: 15},
  infoValue: {fontSize: 15, fontWeight: '500'},
  priorityBadge: {flexDirection: 'row', alignItems: 'center', gap: 6},
  dot: {width: 8, height: 8, borderRadius: 4},
  divider: {height: 1, marginHorizontal: Spacing.md},
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: Spacing.md,
  },
  subtaskCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskCheckmark: {fontSize: 11, fontWeight: '600'},
  subtaskTitle: {fontSize: 15, flex: 1},
  subtaskDone: {opacity: 0.35, textDecorationLine: 'line-through'},
});
