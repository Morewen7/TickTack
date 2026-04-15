import React, {useState} from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassCard} from '../components/GlassCard';
import {ReminderItem} from '../components/ReminderItem';
import {useStore} from '../hooks/useStore';
import {useTheme} from '../theme/ThemeContext';
import {Radius, Spacing} from '../theme';

interface Props {
  navigation: any;
}

export function HomeScreen({navigation}: Props) {
  const {colors, mode} = useTheme();
  const {reminders, lists} = useStore();
  const insets = useSafeAreaInsets();
  const [activeList, setActiveList] = useState('all');
  const [tabsContentWidth, setTabsContentWidth] = useState(0);
  const [tabsContainerWidth, setTabsContainerWidth] = useState(
    Dimensions.get('window').width - Spacing.md * 2,
  );
  const tabsScrollable = tabsContentWidth > tabsContainerWidth && tabsContainerWidth > 0;

  const filtered = reminders.filter(r =>
    activeList === 'all' ? !r.completed : r.listId === activeList && !r.completed,
  );
  const completed = reminders.filter(r =>
    activeList === 'all' ? r.completed : r.listId === activeList && r.completed,
  );
  const activeListData = lists.find(l => l.id === activeList);

  return (
    <View style={[styles.bg, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      {/* Декоративные круги на фоне */}
      <View style={[styles.circle1, {backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'}]} />
      <View style={[styles.circle2, {backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.025)'}]} />
      <View style={[styles.circle3, {backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)'}]} />

      <View style={[styles.container, {paddingTop: insets.top + Spacing.md}]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.count, {color: colors.textSecondary}]}>
            {filtered.length} {filtered.length === 1 ? 'напоминание' : 'напоминаний'}
          </Text>
          <TouchableOpacity
            style={[styles.settingsBtn, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}
            onPress={() => navigation.navigate('Settings')}>
            <Icon name="settings-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={tabsScrollable}
          style={styles.tabsScroll}
          contentContainerStyle={[
            styles.tabs,
            !tabsScrollable && {minWidth: tabsContainerWidth},
          ]}
          onLayout={e => setTabsContainerWidth(e.nativeEvent.layout.width)}
          onContentSizeChange={w => setTabsContentWidth(w)}>
          {lists.map(list => {
            const isActive = activeList === list.id;
            return (
              <TouchableOpacity
                key={list.id}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? colors.accent : colors.card,
                    borderColor: isActive ? colors.accent : colors.cardBorder,
                  },
                ]}
                onPress={() => setActiveList(list.id)}>
                <Text
                  style={[
                    styles.tabText,
                    {color: isActive ? colors.bg : colors.textSecondary},
                  ]}>
                  {list.name}
                </Text>
                {!isActive && (
                  <View style={[styles.tabDot, {backgroundColor: list.color}]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        <GlassCard style={styles.listCard}>
          {filtered.length === 0 && completed.length === 0 && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, {color: colors.textMuted}]}>
                Нет напоминаний
              </Text>
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({item}) => (
              <ReminderItem
                reminder={item}
                onPress={id => navigation.navigate('ReminderDetail', {reminderId: id})}
              />
            )}
            scrollEnabled={false}
          />
          {completed.length > 0 && (
            <>
              <View style={[styles.sectionHeader, {borderTopColor: colors.separator}]}>
                <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>
                  Выполнено ({completed.length})
                </Text>
              </View>
              <FlatList
                data={completed}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <ReminderItem
                    reminder={item}
                    onPress={id => navigation.navigate('ReminderDetail', {reminderId: id})}
                  />
                )}
                scrollEnabled={false}
              />
            </>
          )}
        </GlassCard>
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent,
            bottom: insets.bottom + Spacing.lg,
            shadowColor: colors.accent,
          },
        ]}
        onPress={() => navigation.navigate('AddReminder', {listId: activeList})}>
        <Text style={[styles.fabIcon, {color: colors.bg}]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {flex: 1},
  container: {flex: 1, paddingHorizontal: Spacing.md},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  count: {fontSize: 15, fontWeight: '500'},
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {fontSize: 16},
  tabsScroll: {marginBottom: Spacing.md, flexGrow: 0},
  tabs: {
    gap: Spacing.sm,
    paddingHorizontal: 1,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 5,
  },
  tabText: {fontSize: 13, fontWeight: '500'},
  tabDot: {width: 6, height: 6, borderRadius: 3},
  listCard: {flex: 1},
  empty: {alignItems: 'center', paddingVertical: Spacing.xxl},
  emptyText: {fontSize: 15},
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {fontSize: 26, fontWeight: '300', lineHeight: 30},
  circle1: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -80,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: 120,
    left: -120,
  },
  circle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: 100,
    right: -60,
  },
});
