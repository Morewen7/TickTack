import notifee, {
  AndroidImportance,
  EventType,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
} from '@notifee/react-native';
import {Platform} from 'react-native';
import {Reminder} from '../store/remindersStore';

const CHANNEL_ID = 'ticktack';
const ACTION_COMPLETE = 'complete';
const ACTION_SNOOZE = 'snooze_1h';

export async function requestNotificationPermission(): Promise<boolean> {
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

  await ensureChannel();

  const repeatMap = {
    none: undefined,
    daily: RepeatFrequency.DAILY,
    weekly: RepeatFrequency.WEEKLY,
    monthly: undefined,
  };

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: date.getTime(),
    repeatFrequency: repeatMap[reminder.repeat],
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
        sound: 'default',
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

// Обработчик действий — вызывать в App.tsx
export function registerNotificationHandlers(store: any) {
  notifee.onForegroundEvent(({type, detail}) => {
    const reminderId = detail.notification?.id;
    if (!reminderId) return;

    if (type === EventType.ACTION_PRESS) {
      if (detail.pressAction?.id === ACTION_COMPLETE) {
        store.toggleReminder(reminderId);
      } else if (detail.pressAction?.id === ACTION_SNOOZE) {
        const snoozeDate = new Date(Date.now() + 60 * 60 * 1000);
        const r = store.getState().reminders.find((x: any) => x.id === reminderId);
        if (r) {
          store.updateReminder(reminderId, {dueDate: snoozeDate.toISOString()});
          scheduleNotification({...r, dueDate: snoozeDate.toISOString()});
        }
      }
    }
  });

  notifee.onBackgroundEvent(async ({type, detail}) => {
    const reminderId = detail.notification?.id;
    if (!reminderId) return;

    if (type === EventType.ACTION_PRESS) {
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

export async function cancelNotification(reminderId: string): Promise<void> {
  await notifee.cancelNotification(reminderId);
}

export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}
