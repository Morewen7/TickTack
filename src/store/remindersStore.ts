import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import {scheduleNotification, cancelNotification} from '../utils/notifications';

export type Priority = 'high' | 'medium' | 'low';
export type RepeatInterval = 'none' | 'daily' | 'weekly' | 'monthly';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
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
  createdAt: string;
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
          reminders: saved.reminders || [],
          lists: saved.lists || defaultLists,
        };
      }
    } catch {}
    this.notify();
  }

  private async save() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
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
