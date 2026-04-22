import notifee, {
  AlarmType,
  AndroidImportance,
  EventType,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
} from '@notifee/react-native';
import {PermissionsAndroid, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Reminder} from '../store/remindersStore';

const SETTINGS_KEY = '@ticktack_settings';

async function getSettings(): Promise<{badgeCount: boolean; notificationsSound: boolean}> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return {
        badgeCount: s.badgeCount !== false,
        notificationsSound: s.notificationsSound !== false,
      };
    }
  } catch {}
  return {badgeCount: true, notificationsSound: true};
}

/**
 * Обновляет счётчик на иконке приложения (iOS only).
 * Показывает количество просроченных напоминаний.
 * Если счётчик отключён в настройках — сбрасывает в 0.
 */
export async function refreshBadge(reminders: Reminder[]): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const {badgeCount} = await getSettings();
    if (!badgeCount) {
      await notifee.setBadgeCount(0);
      return;
    }
    const now = new Date();
    const overdueCount = reminders.filter(
      r => !r.completed && !r.archived && r.dueDate && new Date(r.dueDate) <= now,
    ).length;
    await notifee.setBadgeCount(overdueCount);
  } catch {}
}

const CHANNEL_ID = 'ticktack';
const ACTION_COMPLETE = 'complete';
const ACTION_SNOOZE = 'snooze_1h';

export async function requestNotificationPermission(): Promise<boolean> {
  // Android 13+ (API 33) требует явного разрешения POST_NOTIFICATIONS
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'TickTack',
    importance: AndroidImportance.HIGH,
  });
}

export async function scheduleNotification(reminder: Reminder): Promise<void> {
  if (!reminder.dueDate) return;
  const date = new Date(reminder.dueDate);
  if (date <= new Date()) return;

  const {notificationsSound} = await getSettings();
  await ensureChannel();

  // Notifee не поддерживает monthly нативно — создаём разовое уведомление.
  // Для реального ежемесячного повтора нужен планировщик на уровне приложения.
  const repeatMap: Record<string, RepeatFrequency | undefined> = {
    none: undefined,
    daily: RepeatFrequency.DAILY,
    weekly: RepeatFrequency.WEEKLY,
    monthly: undefined,
  };

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: date.getTime(),
    repeatFrequency: repeatMap[reminder.repeat],
    alarmManager: {
      type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
    },
  };

  const timeStr = date.toLocaleTimeString('ru', {hour: '2-digit', minute: '2-digit'});
  const dateStr = date.toLocaleDateString('ru', {day: 'numeric', month: 'long'});

  await notifee.createTriggerNotification(
    {
      id: reminder.id,
      title: reminder.title,
      body: reminder.note
        ? `${reminder.note} · ${dateStr} в ${timeStr}`
        : `${dateStr} в ${timeStr}`,
      ios: {
        sound: notificationsSound ? 'default' : undefined,
        categoryId: 'reminder_actions',
      },
      android: {
        channelId: CHANNEL_ID,
        pressAction: {id: 'default'},
        actions: [
          {title: '✓ Выполнить', pressAction: {id: ACTION_COMPLETE}},
          {title: '⏰ +1 час', pressAction: {id: ACTION_SNOOZE}},
        ],
      },
    },
    trigger,
  );
}

export async function setupNotificationActions(): Promise<void> {
  // setNotificationCategories доступен только на iOS
  if (Platform.OS !== 'ios') return;
  await notifee.setNotificationCategories([
    {
      id: 'reminder_actions',
      actions: [
        {id: ACTION_COMPLETE, title: '✓ Выполнить'},
        {id: ACTION_SNOOZE,   title: '⏰ +1 час'},
      ],
    },
  ]);
}

// Обработчик foreground-событий — вызывать в App.tsx
// Background-обработчик зарегистрирован в index.js (уровень модуля)
export function registerNotificationHandlers(store: any) {
  notifee.onForegroundEvent(async ({type, detail}) => {
    const reminderId = detail.notification?.id;
    if (!reminderId) return;

    if (type === EventType.DELIVERED) {
      // Ежемесячный повтор: планируем следующее уведомление на +1 месяц
      await rescheduleMonthly(reminderId, store);
    } else if (type === EventType.ACTION_PRESS) {
      if (detail.pressAction?.id === ACTION_COMPLETE) {
        store.toggleReminder(reminderId);
      } else if (detail.pressAction?.id === ACTION_SNOOZE) {
        const snoozeDate = new Date(Date.now() + 60 * 60 * 1000);
        const r = store.getState().reminders.find((x: any) => x.id === reminderId);
        if (r) {
          store.updateReminder(reminderId, {dueDate: snoozeDate.toISOString()});
          await scheduleNotification({...r, dueDate: snoozeDate.toISOString()});
        }
      }
    }
  });
}

/**
 * Показывает немедленное уведомление при срабатывании геозоны.
 * Вызывается из startGeofenceMonitor в geolocation.ts.
 */
export async function displayGeofenceNotification(reminder: Reminder): Promise<void> {
  await ensureChannel();
  const direction = reminder.location?.onArrive ? 'Вы прибыли в' : 'Вы покинули';
  const place = reminder.location?.name || 'нужное место';
  await notifee.displayNotification({
    id: `geo_${reminder.id}`,
    title: reminder.title,
    body: `${direction}: ${place}`,
    ios: {sound: 'default', categoryId: 'reminder_actions'},
    android: {
      channelId: CHANNEL_ID,
      pressAction: {id: 'default'},
      actions: [
        {title: '✓ Выполнить', pressAction: {id: ACTION_COMPLETE}},
      ],
    },
  });
}

export async function cancelNotification(reminderId: string): Promise<void> {
  await notifee.cancelNotification(reminderId);
}

export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}

/**
 * Синхронизирует запланированные уведомления Notifee с текущим состоянием стора.
 * Вызывать после store.load() при старте приложения.
 * - Отменяет устаревшие уведомления (выполненные, архивные, удалённые)
 * - Планирует пропущенные (например, после импорта данных)
 */
export async function syncNotifications(reminders: Reminder[]): Promise<void> {
  try {
    const scheduled = await notifee.getTriggerNotifications();
    const scheduledIds = new Set(
      scheduled.map(n => n.notification.id).filter((id): id is string => Boolean(id)),
    );

    const active = reminders.filter(
      r => !r.completed && !r.archived && r.dueDate && new Date(r.dueDate) > new Date(),
    );
    const activeIds = new Set(active.map(r => r.id));

    // Отменяем уведомления выполненных/удалённых/архивных задач
    for (const n of scheduled) {
      if (n.notification.id && !activeIds.has(n.notification.id)) {
        await notifee.cancelTriggerNotification(n.notification.id);
      }
    }

    // Планируем уведомления которых нет в Notifee (например после импорта)
    for (const r of active) {
      if (!scheduledIds.has(r.id)) {
        await scheduleNotification(r).catch(() => {});
      }
    }

    // Обновляем счётчик на иконке
    await refreshBadge(reminders);
  } catch (e) {
    if (__DEV__) { console.error('[syncNotifications] failed:', e); }
  }
}

/**
 * Перепланирует ежемесячное уведомление на следующий месяц.
 * Вызывается при EventType.DELIVERED из foreground и background обработчиков.
 * store.load() должен быть вызван ДО этой функции в background-контексте.
 */
export async function rescheduleMonthly(reminderId: string, storeInstance: any): Promise<void> {
  const r = storeInstance.getState().reminders.find((x: any) => x.id === reminderId);
  if (!r || r.repeat !== 'monthly' || r.completed || r.archived || !r.dueDate) return;
  const nextDate = new Date(r.dueDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  storeInstance.updateReminder(reminderId, {dueDate: nextDate.toISOString()});
  await scheduleNotification({...r, dueDate: nextDate.toISOString()});
}
