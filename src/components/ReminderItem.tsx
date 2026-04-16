import React, {useEffect, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  Dimensions,
} from 'react-native';
import {Reminder, store} from '../store/remindersStore';
import {Radius, Spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';
import {haptics} from '../utils/haptics';

const SWIPE_HINT_KEY = '@ticktack_swipe_hint';

interface Props {
  reminder: Reminder;
  onPress: (id: string) => void;
  isFirst?: boolean;
  onLongPress?: () => void;
  isDragging?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export function ReminderItem({reminder, onPress, isFirst, onLongPress, isDragging}: Props) {
  const {colors} = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const itemHeight = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Анимация выполнения
  const checkScale = useRef(new Animated.Value(1)).current;
  const pulseScale = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  // Свайп-подсказка для первого элемента при первом запуске
  useEffect(() => {
    if (!isFirst) return;
    AsyncStorage.getItem(SWIPE_HINT_KEY).then(shown => {
      if (shown) return;
      AsyncStorage.setItem(SWIPE_HINT_KEY, 'true');
      setTimeout(() => {
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(translateX, {toValue: 60, duration: 350, useNativeDriver: true}),
          Animated.timing(translateX, {toValue: 0, duration: 300, useNativeDriver: true}),
        ]).start();
      }, 300);
    });
  }, [isFirst]);

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

  const animateOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: 0, duration: 200, useNativeDriver: false}),
      Animated.timing(itemHeight, {toValue: 0, duration: 250, useNativeDriver: false}),
    ]).start(callback);
  };

  const animateComplete = () => {
    // Bounce чекбокса
    Animated.sequence([
      Animated.timing(checkScale, {toValue: 1.4, duration: 120, useNativeDriver: true}),
      Animated.spring(checkScale, {toValue: 1, friction: 4, useNativeDriver: true}),
    ]).start();

    // Пульс-кольцо
    pulseScale.setValue(0.4);
    pulseOpacity.setValue(0.7);
    Animated.parallel([
      Animated.timing(pulseScale, {toValue: 2.2, duration: 500, useNativeDriver: true}),
      Animated.timing(pulseOpacity, {toValue: 0, duration: 500, useNativeDriver: true}),
    ]).start();
  };

  const handleToggle = () => {
    haptics.success();
    if (!reminder.completed) {
      animateComplete();
    }
    store.toggleReminder(reminder.id);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          haptics.success();
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            animateOut(() => store.toggleReminder(reminder.id));
          });
        } else if (g.dx < -SWIPE_THRESHOLD) {
          haptics.warning();
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            animateOut(() => store.deleteReminder(reminder.id));
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
          }).start();
        }
      },
    }),
  ).current;

  const bgColor = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, SCREEN_WIDTH],
    outputRange: [
      colors.priorityHigh,
      colors.priorityHigh + '88',
      'transparent',
      colors.priorityLow + '88',
      colors.priorityLow,
    ],
    extrapolate: 'clamp',
  });

  const leftAction = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const rightAction = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const priorityColor = PRIORITY_COLOR[reminder.priority];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity,
          maxHeight: itemHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 80],
          }),
        },
      ]}>
      {/* Фон свайпа */}
      <Animated.View style={[StyleSheet.absoluteFill, {backgroundColor: bgColor, borderRadius: 0}]}>
        <Animated.Text style={[styles.actionLeft, {opacity: leftAction}]}>✓</Animated.Text>
        <Animated.Text style={[styles.actionRight, {opacity: rightAction}]}>✕</Animated.Text>
      </Animated.View>

      <Animated.View
        style={{transform: [{translateX}]}}
        {...panResponder.panHandlers}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.container,
            {borderBottomColor: colors.separator, backgroundColor: isDragging ? colors.bgSecondary : colors.card},
          ]}
          onPress={() => { haptics.light(); onPress(reminder.id); }}
          onLongPress={onLongPress}
          delayLongPress={300}>

          {/* Чекбокс с анимацией */}
          <TouchableOpacity
            style={styles.checkboxArea}
            onPress={handleToggle}
            hitSlop={8}>
            {/* Пульс-кольцо */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: priorityColor,
                  transform: [{scale: pulseScale}],
                  opacity: pulseOpacity,
                },
              ]}
              pointerEvents="none"
            />
            {/* Чекбокс */}
            <Animated.View
              style={[
                styles.checkboxInner,
                {borderColor: priorityColor},
                reminder.completed && {backgroundColor: priorityColor},
                {transform: [{scale: checkScale}]},
              ]}>
              {reminder.completed && (
                <Text style={[styles.checkmark, {color: colors.bg}]}>✓</Text>
              )}
            </Animated.View>
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
              {reminder.tags?.map(tag => (
                <Text key={tag} style={[styles.metaText, styles.tagChip, {color: colors.textMuted, borderColor: colors.cardBorder}]}>
                  #{tag}
                </Text>
              ))}
            </View>
          </View>

          <View style={[styles.priorityDot, {backgroundColor: priorityColor}]} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  checkboxArea: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  pulseRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
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
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  priorityDot: {width: 7, height: 7, borderRadius: Radius.full, marginLeft: Spacing.sm},
  actionLeft: {
    position: 'absolute',
    left: Spacing.lg,
    top: '50%',
    marginTop: -12,
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  actionRight: {
    position: 'absolute',
    right: Spacing.lg,
    top: '50%',
    marginTop: -12,
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
});
