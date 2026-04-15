import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View, Pressable} from 'react-native';
import {Reminder, store} from '../store/remindersStore';
import {Radius, Spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

interface Props {
  reminder: Reminder;
  onPress: (id: string) => void;
}

export function ReminderItem({reminder, onPress}: Props) {
  const {colors} = useTheme();
  const PRIORITY_COLOR = {
    high: colors.priorityHigh,
    medium: colors.priorityMedium,
    low: colors.priorityLow,
  };

  const completedSubtasks = reminder.subtasks.filter(s => s.completed).length;
  const totalSubtasks = reminder.subtasks.length;

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday)
      return 'Сегодня ' + d.toLocaleTimeString('ru', {hour: '2-digit', minute: '2-digit'});
    return d.toLocaleDateString('ru', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
  };

  return (
    <Pressable
      style={({pressed}) => [
        styles.container,
        {borderBottomColor: colors.separator},
        pressed && {opacity: 0.6},
      ]}
      onPress={() => onPress(reminder.id)}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => store.toggleReminder(reminder.id)}
        hitSlop={8}>
        <View
          style={[
            styles.checkboxInner,
            {borderColor: PRIORITY_COLOR[reminder.priority]},
            reminder.completed && {backgroundColor: PRIORITY_COLOR[reminder.priority]},
          ]}>
          {reminder.completed && (
            <Text style={[styles.checkmark, {color: colors.bg}]}>✓</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {color: colors.textPrimary},
            reminder.completed && styles.titleCompleted,
          ]}
          numberOfLines={1}>
          {reminder.title}
        </Text>
        <View style={styles.meta}>
          {reminder.dueDate && (
            <Text style={[styles.metaText, {color: colors.textMuted}]}>
              {formatDate(reminder.dueDate)}
            </Text>
          )}
          {totalSubtasks > 0 && (
            <Text style={[styles.metaText, {color: colors.textMuted}]}>
              {completedSubtasks}/{totalSubtasks}
            </Text>
          )}
          {reminder.repeat !== 'none' && (
            <Text style={[styles.metaText, {color: colors.textMuted}]}>↻</Text>
          )}
        </View>
      </View>

      <View
        style={[
          styles.priorityDot,
          {backgroundColor: PRIORITY_COLOR[reminder.priority]},
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  checkbox: {marginRight: Spacing.md},
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {fontSize: 12, fontWeight: '600'},
  content: {flex: 1},
  title: {fontSize: 16, fontWeight: '500'},
  titleCompleted: {opacity: 0.35, textDecorationLine: 'line-through'},
  meta: {flexDirection: 'row', gap: Spacing.sm, marginTop: 3},
  metaText: {fontSize: 12},
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    marginLeft: Spacing.sm,
  },
});
