/**
 * Data schema migrations for RemindersStore.
 * Each migration is a pure function that transforms data from version N to N+1.
 */

export const SCHEMA_VERSION = 3;

export interface LegacyReminder {
  repeat?: string;
  repeatRule?: RepeatRuleData | null;
  [key: string]: unknown;
}

interface RepeatRuleData {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  byDayOfWeek?: number[];
  byDayOfMonth?: number;
  endDate?: string | null;
  count?: number | null;
}

interface StorageData {
  schemaVersion?: number;
  reminders?: LegacyReminder[];
  lists?: unknown[];
  [key: string]: unknown;
}

type MigrationFn = (data: StorageData) => StorageData;

const REPEAT_TO_RULE: Record<string, RepeatRuleData> = {
  daily: {frequency: 'daily', interval: 1},
  weekly: {frequency: 'weekly', interval: 1},
  monthly: {frequency: 'monthly', interval: 1},
};

const migrations: Record<number, MigrationFn> = {
  // v1 → v2: add repeatRule field to reminders
  1: data => ({
    ...data,
    schemaVersion: 2,
    reminders: (data.reminders || []).map(r => ({
      ...r,
      repeatRule: r.repeatRule ?? null,
    })),
  }),

  // v2 → v3: convert legacy repeat field to repeatRule
  2: data => ({
    ...data,
    schemaVersion: 3,
    reminders: (data.reminders || []).map(r => ({
      ...r,
      repeatRule:
        r.repeatRule ?? (r.repeat ? REPEAT_TO_RULE[r.repeat] : null) ?? null,
    })),
  }),
};

/**
 * Migrates stored data from `fromVersion` to `SCHEMA_VERSION`.
 * Returns the migrated data with `schemaVersion` set to current.
 */
export function migrate(data: StorageData, fromVersion: number): StorageData {
  let current = data;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const fn = migrations[v];
    if (!fn) {
      throw new Error(`Missing migration from v${v} to v${v + 1}`);
    }
    current = fn(current);
  }
  return current;
}
