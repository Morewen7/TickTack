import React from 'react';
import {
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassCard} from '../components/GlassCard';
import {useStore} from '../hooks/useStore';
import {store} from '../store/remindersStore';
import {Radius, Spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {haptics} from '../utils/haptics';

interface Props {
  navigation: any;
}

export function ArchiveScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {colors, mode} = useTheme();
  const {reminders} = useStore();
  const archived = reminders.filter(r => r.archived);

  const handleUnarchive = (id: string) => {
    haptics.light();
    store.unarchiveReminder(id);
  };

  const handleDelete = (id: string) => {
    haptics.warning();
    Alert.alert('Удалить навсегда?', 'Это действие нельзя отменить', [
      {text: 'Отмена', style: 'cancel'},
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => store.deleteReminder(id),
      },
    ]);
  };

  const clearAll = () => {
    if (archived.length === 0) return;
    haptics.warning();
    Alert.alert('Очистить архив?', `Удалить ${archived.length} напоминаний?`, [
      {text: 'Отмена', style: 'cancel'},
      {
        text: 'Очистить',
        style: 'destructive',
        onPress: () => archived.forEach(r => store.deleteReminder(r.id)),
      },
    ]);
  };

  const PRIORITY_COLOR = {
    high: colors.priorityHigh,
    medium: colors.priorityMedium,
    low: colors.priorityLow,
  };

  return (
    <View style={[styles.bg, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.container, {paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md}]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => { haptics.light(); navigation.goBack(); }}>
            <Text style={[styles.navBack, {color: colors.textSecondary}]}>← Назад</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, {color: colors.textPrimary}]}>Архив</Text>
          <TouchableOpacity onPress={clearAll}>
            <Text style={[styles.clearBtn, {color: archived.length > 0 ? colors.priorityHigh : colors.textMuted}]}>
              Очистить
            </Text>
          </TouchableOpacity>
        </View>

        {archived.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, {color: colors.textMuted}]}>Архив пуст</Text>
          </View>
        ) : (
          <GlassCard style={styles.listCard}>
            <FlatList
              data={archived}
              keyExtractor={item => item.id}
              renderItem={({item, index}) => (
                <View
                  style={[
                    styles.row,
                    {borderBottomColor: colors.separator},
                    index < archived.length - 1 && {borderBottomWidth: 1},
                  ]}>
                  <View style={[styles.dot, {backgroundColor: PRIORITY_COLOR[item.priority]}]} />
                  <View style={styles.content}>
                    <Text style={[styles.title, {color: colors.textPrimary}]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.dueDate && (
                      <Text style={[styles.date, {color: colors.textMuted}]}>
                        {new Date(item.dueDate).toLocaleDateString('ru', {
                          day: 'numeric', month: 'short',
                        })}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, {borderColor: colors.cardBorder}]}
                    onPress={() => handleUnarchive(item.id)}>
                    <Text style={[styles.actionBtnText, {color: colors.textSecondary}]}>↩</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, {borderColor: colors.cardBorder, marginLeft: 6}]}
                    onPress={() => handleDelete(item.id)}>
                    <Text style={[styles.actionBtnText, {color: colors.priorityHigh}]}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </GlassCard>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {flex: 1},
  container: {flex: 1, paddingHorizontal: Spacing.md},
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  navBack: {fontSize: 16},
  navTitle: {fontSize: 17, fontWeight: '600'},
  clearBtn: {fontSize: 15},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {fontSize: 17},
  listCard: {flex: 1},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  dot: {width: 7, height: 7, borderRadius: Radius.full},
  content: {flex: 1},
  title: {fontSize: 16, fontWeight: '500'},
  date: {fontSize: 12, marginTop: 2},
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {fontSize: 14},
});
