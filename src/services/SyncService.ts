import {NativeModules} from 'react-native';
import type {Reminder} from '../store/remindersStore';
import {refreshBadge} from './notifications';

const {AppGroupBridge, SpotlightBridge} = NativeModules;

export class SyncService {
  /**
   * Синхронизирует данные с виджетом iOS
   */
  static syncWidget(reminders: Reminder[]): void {
    try {
      if (!AppGroupBridge) {return;}

      const now = new Date();
      const todayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      const active = reminders.filter(r => !r.archived && !r.completed);
      const overdue = active.filter(
        r => r.dueDate && new Date(r.dueDate) < now,
      );
      const today = active.filter(
        r =>
          r.dueDate &&
          new Date(r.dueDate) < todayEnd &&
          new Date(r.dueDate) >= now,
      );
      const upcoming = active.filter(
        r => !r.dueDate || new Date(r.dueDate) >= todayEnd,
      );

      const payload = {
        updatedAt: now.toISOString(),
        totalActive: active.length,
        overdueCount: overdue.length,
        todayCount: today.length,
        items: [...overdue, ...today, ...upcoming].slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          priority: r.priority,
          dueDate: r.dueDate,
          listId: r.listId,
        })),
      };

      AppGroupBridge.setWidgetData(JSON.stringify(payload));
    } catch (e) {
      if (__DEV__) {
        console.error('[SyncService] syncWidget failed:', e);
      }
    }
  }

  /**
   * Синхронизирует данные со Spotlight (iOS поиск)
   */
  static syncSpotlight(reminders: Reminder[]): void {
    try {
      if (!SpotlightBridge) {return;}

      const active = reminders.filter(r => !r.archived && !r.completed);
      SpotlightBridge.indexReminders(
        JSON.stringify(
          active.map(r => ({
            id: r.id,
            title: r.title,
            note: r.note,
            priority: r.priority,
          })),
        ),
      );
    } catch (e) {
      if (__DEV__) {
        console.error('[SyncService] syncSpotlight failed:', e);
      }
    }
  }

  /**
   * Синхронизирует badge (счетчик на иконке приложения)
   */
  static async syncBadge(reminders: Reminder[]): Promise<void> {
    try {
      await refreshBadge(reminders);
    } catch (e) {
      if (__DEV__) {
        console.error('[SyncService] syncBadge failed:', e);
      }
    }
  }

  /**
   * Полная синхронизация всех систем
   */
  static async syncAll(reminders: Reminder[]): Promise<void> {
    this.syncWidget(reminders);
    this.syncSpotlight(reminders);
    await this.syncBadge(reminders);
  }
}
