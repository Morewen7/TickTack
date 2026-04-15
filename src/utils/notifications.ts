import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
} from '@notifee/react-native';
import {Reminder} from '../store/remindersStore';

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

export async function scheduleNotification(reminder: Reminder): Promise<void> {
  if (!reminder.dueDate) return;

  const date = new Date(reminder.dueDate);
  if (date <= new Date()) return;

  // Create channel for Android (required)
  await notifee.createChannel({
    id: 'ticktack',
    name: 'TickTack',
    importance: AndroidImportance.HIGH,
  });

  const repeatMap = {
    none: undefined,
    daily: RepeatFrequency.DAILY,
    weekly: RepeatFrequency.WEEKLY,
    monthly: undefined, // monthly not natively supported, skip
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
        badgeCount: await notifee.getBadgeCount() + 1,
      },
      android: {
        channelId: 'ticktack',
        pressAction: {id: 'default'},
      },
    },
    trigger,
  );
}

export async function cancelNotification(reminderId: string): Promise<void> {
  await notifee.cancelNotification(reminderId);
}

export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}
