import React from 'react';
import {ScrollView, TouchableOpacity, Text, StyleSheet} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import type {Priority} from '../store/remindersStore';

export interface ReminderFilters {
  overdue?: boolean;
  hasDate?: boolean;
  hasLocation?: boolean;
  priority?: Priority;
}

interface FilterChipsProps {
  filters: ReminderFilters;
  onToggleFilter: (key: keyof ReminderFilters, value?: Priority) => void;
}

export function FilterChips({filters, onToggleFilter}: FilterChipsProps) {
  const {colors} = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filtersScroll}>
      <TouchableOpacity
        style={[
          styles.filterChip,
          {
            backgroundColor: filters.overdue
              ? colors.priorityHigh + '22'
              : colors.card,
            borderColor: filters.overdue
              ? colors.priorityHigh
              : colors.cardBorder,
          },
        ]}
        onPress={() => onToggleFilter('overdue')}
        testID="filter-chip-overdue"
        accessibilityLabel="Фильтр просроченных"
        accessibilityState={{selected: !!filters.overdue}}>
        <Text
          style={[
            styles.filterText,
            {
              color: filters.overdue
                ? colors.priorityHigh
                : colors.textSecondary,
            },
          ]}>
          Просрочено
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterChip,
          {
            backgroundColor: filters.hasDate
              ? colors.accent + '22'
              : colors.card,
            borderColor: filters.hasDate ? colors.accent : colors.cardBorder,
          },
        ]}
        onPress={() => onToggleFilter('hasDate')}>
        <Text
          style={[
            styles.filterText,
            {color: filters.hasDate ? colors.accent : colors.textSecondary},
          ]}>
          С датой
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterChip,
          {
            backgroundColor: filters.hasLocation
              ? colors.accent + '22'
              : colors.card,
            borderColor: filters.hasLocation
              ? colors.accent
              : colors.cardBorder,
          },
        ]}
        onPress={() => onToggleFilter('hasLocation')}>
        <Text
          style={[
            styles.filterText,
            {color: filters.hasLocation ? colors.accent : colors.textSecondary},
          ]}>
          С местом
        </Text>
      </TouchableOpacity>
      {(['high', 'medium', 'low'] as Priority[]).map(p => {
        const active = filters.priority === p;
        const pColor =
          p === 'high'
            ? colors.priorityHigh
            : p === 'medium'
            ? colors.priorityMedium
            : colors.priorityLow;
        return (
          <TouchableOpacity
            key={p}
            style={[
              styles.filterChip,
              {
                backgroundColor: active ? pColor + '22' : colors.card,
                borderColor: active ? pColor : colors.cardBorder,
              },
            ]}
            onPress={() => onToggleFilter('priority', p)}>
            <Text
              style={[
                styles.filterText,
                {color: active ? pColor : colors.textSecondary},
              ]}>
              {p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filtersScroll: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
