import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules} from 'react-native';
import uuid from 'react-native-uuid';
import {scheduleNotification, cancelNotification} from '../utils/notifications';

const {AppGroupBridge, SpotlightBridge} = NativeModules;

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

export interface Reminder {
  id: string;
  title: string;
  note: string;
  listId: string;
  priority: Priority;
  dueDate: string | null; // ISO string
  repeat: RepeatInterval;
  subtasks: SubTask[];
  completed: boolean;
  archived: boolean;
  tags: string[];
  createdAt: string;
  location?: ReminderLocation;
}

export interface ReminderList {
  id: string;
  name: string;
  color: string;
  icon: string;
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

  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        this.state = {
          reminders: (saved.reminders || []).map((r: any) => ({
            archived: false,
            tags: [],
            ...r,
          })),
          lists: saved.lists || defaultLists,
        };
      }
    } catch {}
    this.notify();
  }

  private async save() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.syncWidget();
      this.syncSpotlight();
    } catch {}
  }

  private syncWidget() {
    try {
      if (!AppGroupBridge) return;
      const json = JSON.stringify({reminders: this.state.reminders});
      AppGroupBridge.setWidgetData(json);
    } catch {}
  }

  private syncSpotlight() {
    try {
      if (!SpotlightBridge) return;
      const active = this.state.reminders.filter(r => !r.archived && !r.completed);
      SpotlightBridge.indexReminders(JSON.stringify(
        active.map(r => ({id: r.id, title: r.title, note: r.note, priority: r.priority}))
      ));
    } catch {}
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getState(): AppState {
    return this.state;
  }

  addReminder(data: Omit<Reminder, 'id' | 'createdAt'>) {
    const reminder: Reminder = {
      ...data,
      archived: data.archived ?? false,
      tags: data.tags ?? [],
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
    if (reminder) {
      // Если выполнено — отменяем уведомление
      if (!reminder.completed) {
        cancelNotification(id).catch(() => {});
      }
      this.updateReminder(id, {completed: !reminder.completed});
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
      this.updateReminder(id, {archived: true, completed: true});
    }
  }

  unarchiveReminder(id: string) {
    this.updateReminder(id, {archived: false, completed: false});
  }

  exportData(): string {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      reminders: this.state.reminders,
      lists: this.state.lists,
    }, null, 2);
  }

  async importData(json: string): Promise<{imported: number; error?: string}> {
    try {
      const data = JSON.parse(json);
      if (!data.reminders || !Array.isArray(data.reminders)) {
        return {imported: 0, error: 'Неверный формат файла'};
      }
      const reminders: Reminder[] = data.reminders.map((r: any) => ({
        archived: false, tags: [], subtasks: [], ...r,
      }));
      const lists: ReminderList[] = data.lists || this.state.lists;
      this.state = {reminders, lists};
      await this.save();
      this.notify();
      return {imported: reminders.length};
    } catch {
      return {imported: 0, error: 'Не удалось прочитать JSON'};
    }
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
}

export const store = new RemindersStore();
