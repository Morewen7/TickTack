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

const BAR_HEIGHT = 72;
const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function StatsScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {colors, mode} = useTheme();
  const {reminders, lists} = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const completed = reminders.filter(r => r.completed && !r.archived);
    const active = reminders.filter(r => !r.completed && !r.archived);

    // Дата выполнения: completedAt если есть, иначе createdAt как fallback
    const completedDate = (r: (typeof completed)[0]) =>
      r.completedAt ? new Date(r.completedAt) : new Date(r.createdAt);

    const completedThisWeek = completed.filter(r => completedDate(r) >= startOfWeek).length;
    const completedThisMonth = completed.filter(r => completedDate(r) >= startOfMonth).length;

    // Streak — подряд идущих дней с выполнением
    const completedDays = new Set(completed.map(r => completedDate(r).toDateString()));
    let streak = 0;
    const check = new Date(now);
    while (completedDays.has(check.toDateString())) {
      streak++;
      check.setDate(check.getDate() - 1);
    }

    const overdue = active.filter(r => r.dueDate && new Date(r.dueDate) < now).length;
    const todayCount = active.filter(
      r => r.dueDate && new Date(r.dueDate).toDateString() === todayStr,
    ).length;

    const total = reminders.filter(r => !r.archived).length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // График за 7 дней
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toDateString();
      const count = completed.filter(r => completedDate(r).toDateString() === dateStr).length;
      const isToday = i === 6;
      return {
        label: isToday ? 'Сег' : WEEKDAYS_SHORT[d.getDay()],
        count,
        isToday,
      };
    });
    const maxDay = Math.max(...last7Days.map(d => d.count), 1);

    // Распределение по приоритетам (активные)
    const byPriority = {
      high: active.filter(r => r.priority === 'high').length,
      medium: active.filter(r => r.priority === 'medium').length,
      low: active.filter(r => r.priority === 'low').length,
    };

    // Распределение по спискам (активные, исключая "all")
    const byList = lists
      .filter(l => l.id !== 'all')
      .map(l => ({
        name: l.name,
        color: l.color,
        count: active.filter(r => r.listId === l.id).length,
      }))
      .filter(l => l.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      total, completedAll: completed.length, completedThisWeek,
      completedThisMonth, active: active.length, overdue,
      todayCount, streak, completionRate, last7Days, maxDay,
      byPriority, byList,
    };
  }, [reminders, lists]);

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

        {/* График 7 дней */}
        <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>Активность за 7 дней</Text>
        <GlassCard style={styles.card}>
          <View style={styles.barChart}>
            {stats.last7Days.map(({label, count, isToday}, i) => {
              const fillH = count === 0 ? 2 : Math.max(4, Math.round((count / stats.maxDay) * BAR_HEIGHT));
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barCountLabel, {
                    color: count > 0 ? colors.textPrimary : 'transparent',
                    fontWeight: isToday ? '700' : '400',
                  }]}>
                    {count}
                  </Text>
                  <View style={[styles.barTrack, {
                    backgroundColor: colors.bgSecondary,
                    height: BAR_HEIGHT,
                  }]}>
                    <View style={{
                      width: '100%',
                      height: fillH,
                      borderRadius: Radius.sm,
                      backgroundColor: count === 0
                        ? colors.bgSecondary
                        : isToday ? colors.accent : colors.accent + 'bb',
                    }} />
                  </View>
                  <Text style={[styles.barDayLabel, {
                    color: isToday ? colors.accent : colors.textMuted,
                    fontWeight: isToday ? '700' : '400',
                  }]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
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

        {/* Приоритеты */}
        {stats.active > 0 && (
          <>
            <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>По приоритету</Text>
            <GlassCard style={styles.card}>
              {[
                {key: 'high', label: 'Высокий', color: colors.priorityHigh, count: stats.byPriority.high},
                {key: 'medium', label: 'Средний', color: colors.priorityMedium, count: stats.byPriority.medium},
                {key: 'low', label: 'Низкий', color: colors.priorityLow, count: stats.byPriority.low},
              ].filter(p => p.count > 0).map((p, i, arr) => (
                <View key={p.key}>
                  <View style={styles.priorityRow}>
                    <View style={[styles.priorityDot, {backgroundColor: p.color}]} />
                    <Text style={[styles.priorityLabel, {color: colors.textPrimary}]}>{p.label}</Text>
                    <View style={styles.priorityBarWrap}>
                      <View style={[styles.priorityBarBg, {backgroundColor: colors.bgSecondary}]}>
                        <View style={[styles.priorityBarFill, {
                          width: `${Math.round((p.count / stats.active) * 100)}%` as any,
                          backgroundColor: p.color + 'aa',
                        }]} />
                      </View>
                    </View>
                    <Text style={[styles.priorityCount, {color: colors.textSecondary}]}>{p.count}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.divider, {backgroundColor: colors.separator}]} />}
                </View>
              ))}
            </GlassCard>
          </>
        )}

        {/* По спискам */}
        {stats.byList.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>По спискам</Text>
            <GlassCard style={styles.card}>
              {stats.byList.map((l, i) => (
                <View key={l.name}>
                  <View style={styles.priorityRow}>
                    <View style={[styles.priorityDot, {backgroundColor: l.color}]} />
                    <Text style={[styles.priorityLabel, {color: colors.textPrimary}]}>{l.name}</Text>
                    <View style={styles.priorityBarWrap}>
                      <View style={[styles.priorityBarBg, {backgroundColor: colors.bgSecondary}]}>
                        <View style={[styles.priorityBarFill, {
                          width: `${Math.round((l.count / stats.active) * 100)}%` as any,
                          backgroundColor: l.color + 'aa',
                        }]} />
                      </View>
                    </View>
                    <Text style={[styles.priorityCount, {color: colors.textSecondary}]}>{l.count}</Text>
                  </View>
                  {i < stats.byList.length - 1 && <View style={[styles.divider, {backgroundColor: colors.separator}]} />}
                </View>
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
  // Bar chart
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: 4,
  },
  barCol: {flex: 1, alignItems: 'center'},
  barCountLabel: {fontSize: 11, marginBottom: 3, minHeight: 14},
  barTrack: {
    width: '100%', borderRadius: Radius.sm, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barDayLabel: {fontSize: 10, marginTop: 5},
  // Progress
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
  // Priority / list breakdown
  priorityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12, gap: Spacing.sm,
  },
  priorityDot: {width: 10, height: 10, borderRadius: 5},
  priorityLabel: {fontSize: 14, width: 70},
  priorityBarWrap: {flex: 1},
  priorityBarBg: {height: 6, borderRadius: 3, overflow: 'hidden'},
  priorityBarFill: {height: '100%', borderRadius: 3},
  priorityCount: {fontSize: 14, fontWeight: '600', minWidth: 24, textAlign: 'right'},
});
