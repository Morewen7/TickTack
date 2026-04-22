/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, {EventType} from '@notifee/react-native';
import {store} from './src/store/remindersStore';
import {scheduleNotification, rescheduleMonthly} from './src/utils/notifications';

// Обработчик фоновых событий — ОБЯЗАТЕЛЬНО на уровне модуля (до рендера App)
notifee.onBackgroundEvent(async ({type, detail}) => {
  const reminderId = detail.notification?.id;
  if (!reminderId) return;

  if (type === EventType.DELIVERED) {
    // Ежемесячный повтор: загружаем стор и планируем следующее уведомление
    await store.load();
    await rescheduleMonthly(reminderId, store);
    return;
  }

  if (type === EventType.ACTION_PRESS) {
    await store.load();
    const actionId = detail.pressAction?.id;
    if (actionId === 'complete') {
      store.toggleReminder(reminderId);
    } else if (actionId === 'snooze_1h') {
      const snoozeDate = new Date(Date.now() + 60 * 60 * 1000);
      const r = store.getState().reminders.find(x => x.id === reminderId);
      if (r) {
        store.updateReminder(reminderId, {dueDate: snoozeDate.toISOString()});
        await scheduleNotification({...r, dueDate: snoozeDate.toISOString()});
      }
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
