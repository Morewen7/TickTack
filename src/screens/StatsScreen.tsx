import React, {useMemo} from 'react';
import {
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassCard} from '../components/GlassCard';
import {useStore} from '../hooks/useStore';
import {Radius, Spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {haptics} from '../utils/haptics';

interface Props { navigation: any; }

export function StatsScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {colors, mode} = useTheme();
  const {reminders} = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const completed = reminders.filter(r => r.completed && !r.archived);
    const active = reminders.filter(r => !r.completed && !r.archived);

    const completedThisWeek = completed.filter(r => {
      const d = new Date(r.createdAt);
      return d >= startOfWeek;
    }).length;

    const completedThisMonth = completed.filter(r => {
      const d = new Date(r.createdAt);
      return d >= startOfMonth;
    }).length;

    // Считаем streak — подряд идущих дней с выполнением
    const completedDays = new Set(
      completed.map(r => new Date(r.createdAt).toDateString()),
    );
    let streak = 0;
    const check = new Date(now);
    while (completedDays.has(check.toDateString())) {
      streak++;
      check.setDate(check.getDate() - 1);
    }

    const overdue = active.filter(
      r => r.dueDate && new Date(r.dueDate) < now,
    ).length;

    const todayCount = active.filter(
      r => r.dueDate && new Date(r.dueDate).toDateString() === todayStr,
    ).length;

    const total = reminders.filter(r => !r.archived).length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    return {
      total,
      completedAll: completed.length,
      completedThisWeek,
      completedThisMonth,
      active: active.length,
      overdue,
      todayCount,
      streak,
      completionRate,
    };
  }, [reminders]);

  const StatRow = ({label, value, accent}: {label: string; value: string | number; accent?: boolean}) => (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, {color: colors.textSecondary}]}>{label}</Text>
      <Text style={[styles.statValue, {color: accent ? colors.priorityLow : colors.textPrimary}]}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={[styles.bg, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl},
        ]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => { haptics.light(); navigation.goBack(); }}>
            <Text style={[styles.navBack, {color: colors.textSecondary}]}>← Назад</Text>
          </TouchableOpacity>
          <Text style={[styles.navTitle, {color: colors.textPrimary}]}>Статистика</Text>
          <View style={{width: 60}} />
        </View>

        {/* Streak */}
        <GlassCard style={[styles.streakCard, {borderColor: stats.streak > 0 ? colors.priorityMedium + '55' : colors.cardBorder}]}>
          <Text style={[styles.streakNum, {color: stats.streak > 0 ? colors.priorityMedium : colors.textMuted}]}>
            {stats.streak}
          </Text>
          <Text style={[styles.streakLabel, {color: colors.textSecondary}]}>
            {stats.streak === 1 ? 'день подряд' : stats.streak >= 2 && stats.streak <= 4 ? 'дня подряд' : 'дней подряд'}
          </Text>
          <Text style={[styles.streakSub, {color: colors.textMuted}]}>
            {stats.streak > 0 ? 'Отличная серия! Продолжай' : 'Выполни задачу чтобы начать серию'}
          </Text>
        </GlassCard>

        {/* Прогресс */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Прогресс</Text>
        <GlassCard style={styles.card}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, {color: colors.textSecondary}]}>Выполнено</Text>
            <Text style={[styles.progressPct, {color: colors.textPrimary}]}>{stats.completionRate}%</Text>
          </View>
          <View style={[styles.progressBg, {backgroundColor: colors.bgSecondary}]}>
            <View style={[styles.progressFill, {
              width: `${stats.completionRate}%` as any,
              backgroundColor: colors.priorityLow,
            }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={[styles.metaText, {color: colors.textMuted}]}>
              {stats.completedAll} выполнено
            </Text>
            <Text style={[styles.metaText, {color: colors.textMuted}]}>
              {stats.active} активных
            </Text>
          </View>
        </GlassCard>

        {/* Детали */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Детали</Text>
        <GlassCard style={styles.card}>
          <StatRow label="Сегодня" value={stats.todayCount} />
          <View style={[styles.divider, {backgroundColor: colors.separator}]} />
          <StatRow label="За эту неделю" value={stats.completedThisWeek} accent />
          <View style={[styles.divider, {backgroundColor: colors.separator}]} />
          <StatRow label="За этот месяц" value={stats.completedThisMonth} accent />
          <View style={[styles.divider, {backgroundColor: colors.separator}]} />
          <StatRow label="Просрочено" value={stats.overdue} />
          <View style={[styles.divider, {backgroundColor: colors.separator}]} />
          <StatRow label="Всего создано" value={stats.total} />
        </GlassCard>
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
  navBack: {fontSize: 16},
  navTitle: {fontSize: 17, fontWeight: '600'},
  streakCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  streakNum: {fontSize: 72, fontWeight: '800', lineHeight: 80},
  streakLabel: {fontSize: 18, fontWeight: '600', marginTop: 4},
  streakSub: {fontSize: 13, marginTop: 8},
  sectionLabel: {
    fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.xs,
  },
  card: {marginBottom: Spacing.lg},
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
  },
  progressLabel: {fontSize: 15},
  progressPct: {fontSize: 15, fontWeight: '700'},
  progressBg: {
    height: 6, borderRadius: 3, marginHorizontal: Spacing.md,
    marginTop: Spacing.sm, overflow: 'hidden',
  },
  progressFill: {height: '100%', borderRadius: 3},
  progressMeta: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  metaText: {fontSize: 12},
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  statLabel: {fontSize: 15},
  statValue: {fontSize: 17, fontWeight: '700'},
  divider: {height: 1, marginHorizontal: Spacing.md},
});
