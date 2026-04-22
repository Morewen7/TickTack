import React, {useState, useEffect, useRef} from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  Animated,
  Dimensions,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import DraggableFlatList, {ScaleDecorator} from 'react-native-draggable-flatlist';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassCard} from '../components/GlassCard';
import {ReminderItem} from '../components/ReminderItem';
import {useStore} from '../hooks/useStore';
import {useTheme} from '../theme/ThemeContext';
import {Radius, Spacing} from '../theme';
import {haptics} from '../utils/haptics';
import {loadSettings, SortOption} from './SettingsScreen';
import {Reminder, store} from '../store/remindersStore';

interface Props {
  navigation: any;
}


function sortReminders(reminders: Reminder[], sortBy: SortOption): Reminder[] {
  return [...reminders].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'priority': {
        const order = {high: 0, medium: 1, low: 2};
        return order[a.priority] - order[b.priority];
      }
      case 'alphabet':
        return a.title.localeCompare(b.title, 'ru');
      default:
        return 0;
    }
  });
}

export function HomeScreen({navigation}: Props) {
  const {colors, mode, backgroundImage} = useTheme();
  const {reminders, lists} = useStore();
  const insets = useSafeAreaInsets();
  const [activeList, setActiveList] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Быстрое добавление
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const quickAddAnim = useRef(new Animated.Value(0)).current;
  const quickInputRef = useRef<TextInput>(null);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const [tabsContentWidth, setTabsContentWidth] = useState(0);
  const [tabsContainerWidth, setTabsContainerWidth] = useState(
    Dimensions.get('window').width - Spacing.md * 2,
  );
  const tabsScrollable = tabsContentWidth > tabsContainerWidth && tabsContainerWidth > 0;

  useEffect(() => {
    loadSettings().then(s => setSortBy(s.sortBy));
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSettings().then(s => setSortBy(s.sortBy));
    });
    return unsubscribe;
  }, [navigation]);

  const toggleSearch = () => {
    haptics.light();
    const toValue = searchVisible ? 0 : 1;
    setSearchVisible(!searchVisible);
    if (searchVisible) setSearchQuery(''); // очищаем при закрытии
    Animated.spring(searchAnim, {toValue, useNativeDriver: false, friction: 8}).start();
  };

  const openQuickAdd = () => {
    haptics.medium();
    setQuickAddVisible(true);
    Animated.spring(quickAddAnim, {toValue: 1, useNativeDriver: true, friction: 8}).start(() => {
      quickInputRef.current?.focus();
    });
  };

  const closeQuickAdd = () => {
    Keyboard.dismiss();
    Animated.timing(quickAddAnim, {toValue: 0, duration: 200, useNativeDriver: true}).start(() => {
      setQuickAddVisible(false);
      setQuickTitle('');
    });
  };

  const submitQuickAdd = () => {
    if (!quickTitle.trim()) return;
    haptics.success();
    store.addReminder({
      title: quickTitle.trim(),
      note: '',
      listId: activeList === 'all' ? 'personal' : activeList,
      priority: 'medium',
      dueDate: null,
      repeat: 'none',
      subtasks: [],

      completed: false,
      archived: false,
    });
    closeQuickAdd();
  };

  const baseFiltered = reminders.filter(r => {
    if (r.archived) return false;
    if (activeList !== 'all' && r.listId !== activeList) return false;
    const matchSearch = searchQuery
      ? r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.note.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchSearch;
  });

  const filtered = sortReminders(baseFiltered.filter(r => !r.completed), sortBy);
  const completed = sortReminders(baseFiltered.filter(r => r.completed), sortBy);

  const searchHeight = searchAnim.interpolate({inputRange: [0, 1], outputRange: [0, 48]});
  const quickAddY = quickAddAnim.interpolate({inputRange: [0, 1], outputRange: [200, 0]});

  const overdueCount = reminders.filter(
    r => !r.archived && !r.completed && r.dueDate && new Date(r.dueDate) < new Date(),
  ).length;

  const inner = (
    <>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      {backgroundImage && (
        <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.45)'}]} />
      )}
      {!backgroundImage && <View style={[styles.circle1, {backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'}]} />}
      {!backgroundImage && <View style={[styles.circle2, {backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.025)'}]} />}
      {!backgroundImage && <View style={[styles.circle3, {backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)'}]} />}

      <View style={[styles.container, {paddingTop: insets.top + Spacing.md}]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.countWrap} onPress={() => { haptics.light(); navigation.navigate('Stats'); }}>
            <View style={styles.countRow}>
              <Icon name="list-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.count, {color: colors.textSecondary}]}>{filtered.length}</Text>
              {overdueCount > 0 && (
                <>
                  <Icon name="alert-circle" size={14} color={colors.priorityHigh} style={{marginLeft: 6}} />
                  <Text style={[styles.count, {color: colors.priorityHigh}]}>{overdueCount}</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, {backgroundColor: searchVisible ? colors.accent : colors.card, borderColor: colors.cardBorder}]}
              onPress={toggleSearch}>
              <Icon name="search" size={14} color={searchVisible ? colors.bg : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}
              onPress={() => { haptics.light(); navigation.navigate('Archive'); }}>
              <Icon name="archive-outline" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}
              onPress={() => { haptics.light(); navigation.navigate('Settings'); }}>
              <Icon name="settings-outline" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <Animated.View style={[styles.searchContainer, {height: searchHeight, overflow: 'hidden'}]}>
          <View style={[styles.searchBox, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
            <Icon name="search" size={14} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, {color: colors.textPrimary}]}
              placeholder="Поиск..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={searchVisible}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Tabs: умные + обычные */}
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
                onPress={async () => {
                  haptics.light();
                  if (list.private) {
                    try {
                      const rnBiometrics = new ReactNativeBiometrics();
                      const {success} = await rnBiometrics.simplePrompt({
                        promptMessage: `Открыть список "${list.name}"`,
                        cancelButtonText: 'Отмена',
                        allowDeviceCredentials: true,
                      });
                      if (!success) return;
                      setActiveList(list.id);
                    } catch {
                      return;
                    }
                  } else {
                    setActiveList(list.id);
                  }
                }}>
                {(list as any).icon && (
                  <Icon
                    name={(list as any).icon}
                    size={12}
                    color={isActive ? colors.bg : colors.textSecondary}
                  />
                )}
                <Text style={[styles.tabText, {color: isActive ? colors.bg : colors.textSecondary}]}>
                  {list.name}
                </Text>
                {!isActive && <View style={[styles.tabDot, {backgroundColor: list.color}]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tag Filter */}
        {/* List */}
        <GlassCard style={styles.listCard}>
          <DraggableFlatList
            data={filtered}
            keyExtractor={item => item.id}
            style={styles.list}
            containerStyle={styles.list}
            renderItem={({item, drag, isActive, getIndex}) => (
              <ScaleDecorator>
                <ReminderItem
                  reminder={item}
                  isFirst={getIndex() === 0}
                  onPress={id => navigation.navigate('ReminderDetail', {reminderId: id})}
                  onLongPress={drag}
                  isDragging={isActive}
                />
              </ScaleDecorator>
            )}
            onDragEnd={({data}) => {
              haptics.light();
              const otherReminders = store.getState().reminders.filter(
                r => !filtered.find(f => f.id === r.id),
              );
              store.reorderReminders([...data, ...otherReminders]);
            }}
            scrollEnabled
            activationDistance={10}
            ListEmptyComponent={
              completed.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={[styles.emptyIcon, {color: colors.textMuted}]}>
                    {searchQuery ? '⌕' : '○'}
                  </Text>
                  <Text style={[styles.emptyText, {color: colors.textMuted}]}>
                    {searchQuery ? 'Ничего не найдено' : 'Нет напоминаний'}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              completed.length > 0 ? (
                <>
                  <View style={[styles.sectionHeader, {borderTopColor: colors.separator}]}>
                    <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>
                      Выполнено ({completed.length})
                    </Text>
                  </View>
                  {completed.map(item => (
                    <ReminderItem
                      key={item.id}
                      reminder={item}
                      onPress={id => navigation.navigate('ReminderDetail', {reminderId: id})}
                    />
                  ))}
                </>
              ) : null
            }
          />
        </GlassCard>
      </View>

      {/* FAB — долгое нажатие = быстрое добавление */}
      <TouchableOpacity
        style={[styles.fab, {backgroundColor: colors.accent, bottom: insets.bottom + Spacing.lg, shadowColor: colors.accent}]}
        onPress={() => { haptics.medium(); navigation.navigate('AddReminder', {listId: activeList === 'all' ? 'personal' : activeList}); }}
        onLongPress={openQuickAdd}
        delayLongPress={400}>
        <Text style={[styles.fabIcon, {color: colors.bg}]}>+</Text>
      </TouchableOpacity>

      {/* Quick Add Overlay */}
      {quickAddVisible && (
        <KeyboardAvoidingView
          style={[StyleSheet.absoluteFill, {justifyContent: 'flex-end'}]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={closeQuickAdd}>
            <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.overlay}]} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.quickBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  marginBottom: insets.bottom + Spacing.sm,
                  transform: [{translateY: quickAddY}],
                },
              ]}>
              <TextInput
                ref={quickInputRef}
                style={[styles.quickInput, {color: colors.textPrimary}]}
                placeholder="Быстрое добавление..."
                placeholderTextColor={colors.textMuted}
                value={quickTitle}
                onChangeText={setQuickTitle}
                onSubmitEditing={submitQuickAdd}
                returnKeyType="done"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.quickBtn, {backgroundColor: quickTitle.trim() ? colors.accent : colors.bgSecondary}]}
                onPress={submitQuickAdd}>
                <Icon name="arrow-up" size={18} color={quickTitle.trim() ? colors.bg : colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}
    </>
  );

  if (backgroundImage) {
    return (
      <ImageBackground
        source={{uri: backgroundImage}}
        style={[styles.bg, {backgroundColor: colors.bg}]}
        resizeMode="cover">
        {inner}
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.bg, {backgroundColor: colors.bg}]}>
      {inner}
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
    marginBottom: Spacing.md,
  },
  countWrap: {flex: 1, marginRight: Spacing.sm},
  countRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  count: {fontSize: 13, fontWeight: '500'},
  headerActions: {flexDirection: 'row', gap: 6, flexShrink: 0},
  iconBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  searchContainer: {marginBottom: Spacing.sm},
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.full, borderWidth: 1,
    paddingHorizontal: Spacing.md, gap: Spacing.sm, height: 40,
  },
  searchInput: {flex: 1, fontSize: 15},
  tabsScroll: {marginBottom: Spacing.md, flexGrow: 0},
  tabs: {
    gap: Spacing.sm, paddingHorizontal: 1,
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
  },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, gap: 4,
  },
  tabText: {fontSize: 12, fontWeight: '500'},
  tabDot: {width: 5, height: 5, borderRadius: 3},
  listCard: {flex: 1},
  list: {flex: 1},
  empty: {alignItems: 'center', paddingVertical: Spacing.xxl},
  emptyIcon: {fontSize: 36, marginBottom: Spacing.sm},
  emptyText: {fontSize: 15},
  sectionHeader: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute', right: Spacing.lg,
    width: 56, height: 56, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  fabIcon: {fontSize: 26, fontWeight: '300', lineHeight: 30},
  quickOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  quickBox: {
    marginHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  quickInput: {flex: 1, fontSize: 16, paddingVertical: 8},
  quickBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  circle1: {position: 'absolute', width: 340, height: 340, borderRadius: 170, top: -80, right: -100},
  circle2: {position: 'absolute', width: 260, height: 260, borderRadius: 130, top: 120, left: -120},
  circle3: {position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: 100, right: -60},
});
