import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../theme/ThemeContext';
import {haptics} from '../utils/haptics';

interface HomeHeaderProps {
  filteredCount: number;
  overdueCount: number;
  searchVisible: boolean;
  onStatsPress: () => void;
  onSearchPress: () => void;
  onArchivePress: () => void;
  onSettingsPress: () => void;
}

export function HomeHeader({
  filteredCount,
  overdueCount,
  searchVisible,
  onStatsPress,
  onSearchPress,
  onArchivePress,
  onSettingsPress,
}: HomeHeaderProps) {
  const {colors} = useTheme();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.countWrap}
        onPress={() => {
          haptics.light();
          onStatsPress();
        }}>
        <View style={styles.countRow}>
          <Icon name="list-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.count, {color: colors.textSecondary}]}>
            {filteredCount}
          </Text>
          {overdueCount > 0 && (
            <>
              <Icon
                name="alert-circle"
                size={14}
                color={colors.priorityHigh}
                style={{marginLeft: 6}}
              />
              <Text style={[styles.count, {color: colors.priorityHigh}]}>
                {overdueCount}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            {
              backgroundColor: searchVisible ? colors.accent : colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={onSearchPress}
          testID="btn-search"
          accessibilityLabel="Поиск">
          <Icon
            name="search"
            size={14}
            color={searchVisible ? colors.bg : colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            {backgroundColor: colors.card, borderColor: colors.cardBorder},
          ]}
          onPress={() => {
            haptics.light();
            onArchivePress();
          }}>
          <Icon name="archive-outline" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            {backgroundColor: colors.card, borderColor: colors.cardBorder},
          ]}
          onPress={() => {
            haptics.light();
            onSettingsPress();
          }}>
          <Icon
            name="settings-outline"
            size={14}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countWrap: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
