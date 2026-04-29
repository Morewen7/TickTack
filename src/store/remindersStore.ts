import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import {scheduleNotification, cancelNotification} from '../utils/notifications';
import {SCHEMA_VERSION, migrate, type LegacyReminder} from './migrations';
import {SyncService} from '../services/SyncService';

export type Priority = 'high' | 'medium' | 'low';
export type RepeatInterval = 'none' | 'daily' | 'weekly' | 'monthly';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface ReminderLocation {
  latitude: number;
  longitude: number;
  radius: number; // метры
  name: string;
  onArrive: boolean; // true = при прибытии, false = при отъезде
}

export interface RepeatRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  byDayOfWeek?: number[]; // 0=Sun..6=Sat
  byDayOfMonth?: number; // 1-31
  endDate?: string | null;
  count?: number | null;
}

export interface Reminder {
  id: string;
  title: string;
  note: string;
  listId: string;
  priority: Priority;
  dueDate: string | null; // ISO string
  repeat: RepeatInterval;
  repeatRule?: RepeatRule | null;
  subtasks: SubTask[];
  completed: boolean;
  archived: boolean;
  createdAt: string;
  completedAt?: string; // ISO string, заполняется при выполнении
  location?: ReminderLocation;
}

export interface ReminderList {
  id: string;
  name: string;
  color: string;
  icon: string;
  private?: boolean;
}

export interface AppState {
  reminders: Reminder[];
  lists: ReminderList[];
}

const STORAGE_KEY = '@ticktack_data';

const defaultLists: ReminderList[] = [
  {id: 'all', name: 'Все', color: '#00d4ff', icon: 'list'},
  {id: 'personal', name: 'Личное', color: '#06d6a0', icon: 'person'},
  {id: 'work', name: 'Работа', color: '#ffd166', icon: 'briefcase'},
  {id: 'shopping', name: 'Покупки', color: '#ff4d6d', icon: 'cart'},
];

class RemindersStore {
  private state: AppState = {
    reminders: [],
    lists: defaultLists,
  };
  private listeners: (() => void)[] = [];
  private _saveTimer: ReturnType<typeof setTimeout> | null = null;

  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        let saved = JSON.parse(raw);
        const version = saved.schemaVersion ?? 1;
        if (version < SCHEMA_VERSION) {
          saved = migrate(saved, version);
        }
        this.state = {
          reminders: (saved.reminders || []).map((r: any) => ({
            archived: false,
            ...r,
          })),
          lists: saved.lists || defaultLists,
        };
        // Persist migrated data if version changed
        if (version < SCHEMA_VERSION) {
          this.saveImmediate();
        }
      }
    } catch (e) {
      if (__DEV__) {
        console.error('[RemindersStore] load failed:', e);
      }
    }
    this.notify();
  }

  private save() {
    if (this._saveTimer) {clearTimeout(this._saveTimer);}
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.saveImmediate();
    }, 300);
  }

  private async saveImmediate() {
    try {
      const payload = {
        schemaVersion: SCHEMA_VERSION,
        reminders: this.state.reminders,
        lists: this.state.lists,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      await SyncService.syncAll(this.state.reminders);
    } catch (e) {
      if (__DEV__) {
        console.error('[RemindersStore] save failed:', e);
      }
    }
  }

  /** Flush any pending debounced save immediately. Call before app goes to background. */
  flush() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
      this.saveImmediate();
    }
  }

  /** Принудительно отправляет актуальное состояние в виджет и Spotlight. */
  refreshSync() {
    SyncService.syncAll(this.state.reminders).catch(() => {});
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        if (__DEV__) {
          console.error('[RemindersStore] listener error:', e);
        }
      }
    });
  }

  getState(): AppState {
    return this.state;
  }

  addReminder(data: Omit<Reminder, 'id' | 'createdAt'>) {
    const reminder: Reminder = {
      ...data,
      archived: data.archived ?? false,
      id: uuid.v4() as string,
      createdAt: new Date().toISOString(),
    };
    this.state = {
      ...this.state,
      reminders: [reminder, ...this.state.reminders],
    };
    this.save();
    this.notify();
    // Планируем уведомление если есть дата
    if (reminder.dueDate) {
      scheduleNotification(reminder).catch(() => {});
    }
    return reminder;
  }

  updateReminder(id: string, data: Partial<Reminder>) {
    this.state = {
      ...this.state,
      reminders: this.state.reminders.map(r =>
        r.id === id ? {...r, ...data} : r,
      ),
    };
    this.save();
    this.notify();
  }

  deleteReminder(id: string) {
    cancelNotification(id).catch(() => {});
    this.state = {
      ...this.state,
      reminders: this.state.reminders.filter(r => r.id !== id),
    };
    this.save();
    this.notify();
  }

  toggleReminder(id: string) {
    const reminder = this.state.reminders.find(r => r.id === id);
    if (!reminder) {return;}
    if (!reminder.completed) {
      // Отмечаем выполненным — фиксируем время выполнения, отменяем уведомление
      cancelNotification(id).catch(() => {});
      this.updateReminder(id, {
        completed: true,
        completedAt: new Date().toISOString(),
      });
    } else {
      // Снимаем отметку — очищаем completedAt, перепланируем если дата ещё не прошла
      if (reminder.dueDate && new Date(reminder.dueDate) > new Date()) {
        scheduleNotification(reminder).catch(() => {});
      }
      this.updateReminder(id, {completed: false, completedAt: undefined});
    }
  }

  toggleSubtask(reminderId: string, subtaskId: string) {
    const reminder = this.state.reminders.find(r => r.id === reminderId);
    if (reminder) {
      const subtasks = reminder.subtasks.map(s =>
        s.id === subtaskId ? {...s, completed: !s.completed} : s,
      );
      this.updateReminder(reminderId, {subtasks});
    }
  }

  deleteList(id: string) {
    this.state = {
      ...this.state,
      lists: this.state.lists.filter(l => l.id !== id),
    };
    this.save();
    this.notify();
  }

  archiveReminder(id: string) {
    const reminder = this.state.reminders.find(r => r.id === id);
    if (reminder) {
      cancelNotification(id).catch(() => {});
      this.updateReminder(id, {
        archived: true,
        completed: true,
        completedAt: reminder.completedAt ?? new Date().toISOString(),
      });
    }
  }

  unarchiveReminder(id: string) {
    this.updateReminder(id, {archived: false, completed: false});
  }

  exportData(): string {
    return JSON.stringify(
      {
        version: 1,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        reminders: this.state.reminders,
        lists: this.state.lists,
      },
      null,
      2,
    );
  }

  exportDataCSV(): string {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const headers =
      'id,title,note,priority,dueDate,repeat,completed,completedAt,archived,createdAt,listId,locationName';
    const rows = this.state.reminders.map(r =>
      [
        r.id,
        esc(r.title),
        esc(r.note),
        r.priority,
        r.dueDate ?? '',
        r.repeat,
        r.completed ? '1' : '0',
        r.completedAt ?? '',
        r.archived ? '1' : '0',
        r.createdAt,
        r.listId,
        r.location ? esc(r.location.name) : '',
      ].join(','),
    );
    return [headers, ...rows].join('\n');
  }

  async importData(json: string): Promise<{imported: number; error?: string}> {
    try {
      let data: unknown = JSON.parse(json);

      if (
        typeof data !== 'object' ||
        data === null ||
        !('reminders' in data) ||
        !Array.isArray(data.reminders)
      ) {
        return {imported: 0, error: 'Неверный формат файла'};
      }

      // Run migrations on imported data if needed
      const version =
        'schemaVersion' in data && typeof data.schemaVersion === 'number'
          ? data.schemaVersion
          : 1;
      if (version < SCHEMA_VERSION) {
        data = migrate(
          data as {
            reminders: LegacyReminder[];
            schemaVersion?: number;
            lists?: unknown[];
          },
          version,
        );
      }

      const importedData = data as {
        reminders: LegacyReminder[];
        lists?: unknown[];
      };
      const reminders: Reminder[] = importedData.reminders.map(r => ({
        id: '',
        title: '',
        note: '',
        listId: 'personal',
        priority: 'medium' as Priority,
        dueDate: null,
        repeat: 'none' as RepeatInterval,
        subtasks: [],
        completed: false,
        archived: false,
        createdAt: new Date().toISOString(),
        ...r,
      }));
      const lists: ReminderList[] =
        (importedData.lists as ReminderList[]) || this.state.lists;
      this.state = {reminders, lists};
      await this.saveImmediate();
      this.notify();
      return {imported: reminders.length};
    } catch (e) {
      if (__DEV__) {
        console.error('[RemindersStore] importData failed:', e);
      }
      return {imported: 0, error: 'Не удалось прочитать JSON'};
    }
  }

  bulkComplete(ids: string[]) {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      reminders: this.state.reminders.map(r =>
        idSet.has(r.id) && !r.completed
          ? {...r, completed: true, completedAt: now}
          : r,
      ),
    };
    ids.forEach(id => cancelNotification(id).catch(() => {}));
    this.save();
    this.notify();
  }

  bulkDelete(ids: string[]) {
    ids.forEach(id => cancelNotification(id).catch(() => {}));
    const idSet = new Set(ids);
    this.state = {
      ...this.state,
      reminders: this.state.reminders.filter(r => !idSet.has(r.id)),
    };
    this.save();
    this.notify();
  }

  bulkArchive(ids: string[]) {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      reminders: this.state.reminders.map(r =>
        idSet.has(r.id)
          ? {
              ...r,
              archived: true,
              completed: true,
              completedAt: r.completedAt ?? now,
            }
          : r,
      ),
    };
    ids.forEach(id => cancelNotification(id).catch(() => {}));
    this.save();
    this.notify();
  }

  bulkMoveTo(ids: string[], listId: string) {
    const idSet = new Set(ids);
    this.state = {
      ...this.state,
      reminders: this.state.reminders.map(r =>
        idSet.has(r.id) ? {...r, listId} : r,
      ),
    };
    this.save();
    this.notify();
  }

  reorderReminders(reminders: Reminder[]) {
    this.state = {...this.state, reminders};
    this.save();
    this.notify();
  }

  addList(name: string, color: string, icon: string) {
    const list: ReminderList = {
      id: uuid.v4() as string,
      name,
      color,
      icon,
    };
    this.state = {
      ...this.state,
      lists: [...this.state.lists, list],
    };
    this.save();
    this.notify();
  }

  updateList(id: string, data: Partial<ReminderList>) {
    this.state = {
      ...this.state,
      lists: this.state.lists.map(l => (l.id === id ? {...l, ...data} : l)),
    };
    this.save();
    this.notify();
  }
}

export const store = new RemindersStore();
