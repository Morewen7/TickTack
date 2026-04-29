import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  Animated,
  Dimensions,
  FlatList,
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
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GlassCard} from '../components/GlassCard';
import {ReminderItem} from '../components/ReminderItem';
import {HomeHeader} from '../components/HomeHeader';
import {SearchBar} from '../components/SearchBar';
import {FilterChips, ReminderFilters} from '../components/FilterChips';
import {SelectionToolbar} from '../components/SelectionToolbar';
import {useStore} from '../hooks/useStore';
import {useTheme} from '../theme/ThemeContext';
import {Radius, Spacing} from '../theme';
import {haptics} from '../utils/haptics';
import {loadSettings, SortOption} from './SettingsScreen';
import {store} from '../store/remindersStore';
import {sortReminders} from '../utils/sortReminders';
import {useFilteredReminders} from '../hooks/useFilteredReminders';
import type {Priority, Reminder} from '../store/remindersStore';

export {sortReminders};

interface Props {
  navigation: any;
}

export function HomeScreen({navigation}: Props) {
  const {colors, mode, backgroundImage} = useTheme();
  const {reminders, lists} = useStore();
  const insets = useSafeAreaInsets();
  const [activeList, setActiveList] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filters, setFilters] = useState<ReminderFilters>({});

  // Быстрое добавление
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const exitSelection = useCallback(() => setSelectedIds(new Set()), []);

  const [showMoveList, setShowMoveList] = useState(false);

  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const quickAddAnim = useRef(new Animated.Value(0)).current;
  const quickInputRef = useRef<TextInput>(null);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const [tabsContentWidth, setTabsContentWidth] = useState(0);
  const [tabsContainerWidth, setTabsContainerWidth] = useState(
    Dimensions.get('window').width - Spacing.md * 2,
  );
  const tabsScrollable =
    tabsContentWidth > tabsContainerWidth && tabsContainerWidth > 0;

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
    if (searchVisible) {setSearchQuery('');} // очищаем при закрытии
    Animated.spring(searchAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
    }).start();
  };

  const openQuickAdd = () => {
    haptics.medium();
    setQuickAddVisible(true);
    Animated.spring(quickAddAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start(() => {
      quickInputRef.current?.focus();
    });
  };

  const closeQuickAdd = () => {
    Keyboard.dismiss();
    Animated.timing(quickAddAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setQuickAddVisible(false);
      setQuickTitle('');
    });
  };

  const submitQuickAdd = () => {
    if (!quickTitle.trim()) {return;}
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

  const {filtered, completed} = useFilteredReminders(
    reminders,
    activeList,
    searchQuery,
    filters,
    sortBy,
  );

  const searchHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });
  const quickAddY = quickAddAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });

  const handleItemPress = useCallback(
    (id: string) => {
      navigation.navigate('ReminderDetail', {reminderId: id});
    },
    [navigation],
  );

  const handleBulkComplete = useCallback(() => {
    haptics.success();
    store.bulkComplete(Array.from(selectedIds));
    exitSelection();
  }, [selectedIds, exitSelection]);

  const handleBulkDelete = useCallback(() => {
    haptics.warning();
    store.bulkDelete(Array.from(selectedIds));
    exitSelection();
  }, [selectedIds, exitSelection]);

  const handleBulkArchive = useCallback(() => {
    haptics.light();
    store.bulkArchive(Array.from(selectedIds));
    exitSelection();
  }, [selectedIds, exitSelection]);

  const handleBulkMove = useCallback(
    (listId: string) => {
      haptics.light();
      store.bulkMoveTo(Array.from(selectedIds), listId);
      exitSelection();
    },
    [selectedIds, exitSelection],
  );

  const handleDragEnd = useCallback(({data}: {data: Reminder[]}) => {
    haptics.light();
    const otherReminders = store
      .getState()
      .reminders.filter(r => !data.find(f => f.id === r.id));
    store.reorderReminders([...data, ...otherReminders]);
  }, []);

  const toggleFilter = useCallback(
    (key: keyof ReminderFilters, value?: Priority) => {
      setFilters(prev => {
        if (key === 'priority') {
          return prev.priority === value
            ? {...prev, priority: undefined}
            : {...prev, priority: value};
        }
        return {...prev, [key]: prev[key] ? undefined : true};
      });
    },
    [],
  );

  const overdueCount = useMemo(
    () =>
      reminders.filter(
        r =>
          !r.archived &&
          !r.completed &&
          r.dueDate &&
          new Date(r.dueDate) < new Date(),
      ).length,
    [reminders],
  );

  const inner = (
    <>
      <View
        testID="home-screen"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      {backgroundImage && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {backgroundColor: 'rgba(0,0,0,0.45)'},
          ]}
        />
      )}
      {!backgroundImage && (
        <View
          style={[
            styles.circle1,
            {
              backgroundColor:
                mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
            },
          ]}
        />
      )}
      {!backgroundImage && (
        <View
          style={[
            styles.circle2,
            {
              backgroundColor:
                mode === 'dark'
                  ? 'rgba(255,255,255,0.02)'
                  : 'rgba(0,0,0,0.025)',
            },
          ]}
        />
      )}
      {!backgroundImage && (
        <View
          style={[
            styles.circle3,
            {
              backgroundColor:
                mode === 'dark'
                  ? 'rgba(255,255,255,0.015)'
                  : 'rgba(0,0,0,0.02)',
            },
          ]}
        />
      )}

      <View style={[styles.container, {paddingTop: insets.top + Spacing.md}]}>
        <HomeHeader
          filteredCount={filtered.length}
          overdueCount={overdueCount}
          searchVisible={searchVisible}
          onStatsPress={() => navigation.navigate('Stats')}
          onSearchPress={toggleSearch}
          onArchivePress={() => navigation.navigate('Archive')}
          onSettingsPress={() => navigation.navigate('Settings')}
        />

        <SearchBar
          searchVisible={searchVisible}
          searchQuery={searchQuery}
          searchHeight={searchHeight}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {searchVisible && (
          <FilterChips filters={filters} onToggleFilter={toggleFilter} />
        )}

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
                      const rnBiometrics = new ReactNativeBiometrics({
                        allowDeviceCredentials: true,
                      });
                      const {success} = await rnBiometrics.simplePrompt({
                        promptMessage: `Открыть список "${list.name}"`,
                        cancelButtonText: 'Отмена',
                      });
                      if (!success) {return;}
                      setActiveList(list.id);
                    } catch {
                      return;
                    }
                  } else {
                    setActiveList(list.id);
                  }
                }}>
                {list.icon && (
                  <Icon
                    name={list.icon}
                    size={12}
                    color={isActive ? colors.bg : colors.textSecondary}
                  />
                )}
                <Text
                  style={[
                    styles.tabText,
                    {color: isActive ? colors.bg : colors.textSecondary},
                  ]}>
                  {list.name}
                </Text>
                {!isActive && (
                  <View
                    style={[styles.tabDot, {backgroundColor: list.color}]}
                  />
                )}
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
                  onPress={handleItemPress}
                  onLongPress={selectionMode ? undefined : drag}
                  isDragging={isActive}
                  selected={selectedIds.has(item.id)}
                  selectionMode={selectionMode}
                  onSelectToggle={toggleSelect}
                />
              </ScaleDecorator>
            )}
            onDragEnd={handleDragEnd}
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
                  <View
                    style={[
                      styles.sectionHeader,
                      {borderTopColor: colors.separator},
                    ]}>
                    <Text
                      style={[styles.sectionTitle, {color: colors.textMuted}]}>
                      Выполнено ({completed.length})
                    </Text>
                  </View>
                  <FlatList
                    data={completed}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    renderItem={({item}) => (
                      <ReminderItem
                        reminder={item}
                        onPress={handleItemPress}
                        selected={selectedIds.has(item.id)}
                        selectionMode={selectionMode}
                        onSelectToggle={toggleSelect}
                      />
                    )}
                    getItemLayout={(_data, index) => ({
                      length: 70,
                      offset: 70 * index,
                      index,
                    })}
                  />
                </>
              ) : null
            }
          />
        </GlassCard>
      </View>

      {/* Bulk action toolbar */}
      {selectionMode && (
        <SelectionToolbar
          selectedCount={selectedIds.size}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onMove={() => setShowMoveList(true)}
          onDelete={handleBulkDelete}
          onCancel={exitSelection}
        />
      )}

      {/* Move-to-list modal */}
      {showMoveList && (
        <TouchableWithoutFeedback onPress={() => setShowMoveList(false)}>
          <View style={[StyleSheet.absoluteFill, styles.moveOverlay]}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.moveSheet,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    paddingBottom: insets.bottom + Spacing.md,
                  },
                ]}>
                <Text style={[styles.moveTitle, {color: colors.textPrimary}]}>
                  Переместить в список
                </Text>
                {lists
                  .filter(l => l.id !== 'all')
                  .map(list => (
                    <TouchableOpacity
                      key={list.id}
                      style={[
                        styles.moveListItem,
                        {borderBottomColor: colors.separator},
                      ]}
                      onPress={() => {
                        setShowMoveList(false);
                        handleBulkMove(list.id);
                      }}>
                      <View
                        style={[
                          styles.moveListDot,
                          {backgroundColor: list.color},
                        ]}
                      />
                      <Text
                        style={[
                          styles.moveListName,
                          {color: colors.textPrimary},
                        ]}>
                        {list.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* FAB — долгое нажатие = быстрое добавление */}
      {!selectionMode && (
        <TouchableOpacity
          testID="fab-add"
          style={[
            styles.fab,
            {
              backgroundColor: colors.accent,
              bottom: insets.bottom + Spacing.lg,
              shadowColor: colors.accent,
            },
          ]}
          onPress={() => {
            haptics.medium();
            navigation.navigate('AddReminder', {
              listId: activeList === 'all' ? 'personal' : activeList,
            });
          }}
          onLongPress={openQuickAdd}
          delayLongPress={400}
          accessibilityLabel="Добавить напоминание"
          accessibilityRole="button"
          accessibilityHint="Долгое нажатие для быстрого добавления">
          <Text style={[styles.fabIcon, {color: colors.bg}]}>+</Text>
        </TouchableOpacity>
      )}

      {/* Quick Add Overlay */}
      {quickAddVisible && (
        <KeyboardAvoidingView
          style={[StyleSheet.absoluteFill, {justifyContent: 'flex-end'}]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={closeQuickAdd}>
            <View
              style={[
                StyleSheet.absoluteFill,
                {backgroundColor: colors.overlay},
              ]}
            />
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
                testID="quick-add-input"
                style={[styles.quickInput, {color: colors.textPrimary}]}
                placeholder="Быстрое добавление..."
                placeholderTextColor={colors.textMuted}
                value={quickTitle}
                onChangeText={setQuickTitle}
                onSubmitEditing={submitQuickAdd}
                returnKeyType="done"
                autoFocus
                accessibilityLabel="Быстрое добавление"
              />
              <TouchableOpacity
                testID="quick-add-submit"
                style={[
                  styles.quickBtn,
                  {
                    backgroundColor: quickTitle.trim()
                      ? colors.accent
                      : colors.bgSecondary,
                  },
                ]}
                onPress={submitQuickAdd}
                accessibilityLabel="Добавить"
                accessibilityRole="button">
                <Icon
                  name="arrow-up"
                  size={18}
                  color={quickTitle.trim() ? colors.bg : colors.textMuted}
                />
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

  return <View style={[styles.bg, {backgroundColor: colors.bg}]}>{inner}</View>;
}

const styles = StyleSheet.create({
  bg: {flex: 1},
  container: {flex: 1, paddingHorizontal: Spacing.md},
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  tabText: {fontSize: 12, fontWeight: '500'},
  tabDot: {width: 5, height: 5, borderRadius: 3},
  listCard: {flex: 1},
  list: {flex: 1},
  empty: {alignItems: 'center', paddingVertical: Spacing.xxl},
  emptyIcon: {fontSize: 36, marginBottom: Spacing.sm},
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
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveOverlay: {backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  moveSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    paddingTop: Spacing.md,
  },
  moveTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  moveListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  moveListDot: {width: 10, height: 10, borderRadius: 5},
  moveListName: {fontSize: 15},
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
