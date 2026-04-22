# TickTack — контекст сессии (2026-04-20)

## Что сделано в этой сессии

### 1. Feature graphic (промо-баннер)
- Создан `STORE_SUBMISSION/feature_graphic.png` — баннер 1024×500 px для магазинов
- Исходник: `STORE_SUBMISSION/feature_graphic.svg`
- Скрипт генерации: `STORE_SUBMISSION/generate_banner.py` (Python + Pillow)
- Стиль: тёмный фон, фиолетово-голубой акцент, макет телефона справа, лого + фичи слева

### 2. Release билды
- **v1.0** — `STORE_SUBMISSION/TickTack_v1.0_release.apk` (старый, до сессии)
- **v1.1** — `STORE_SUBMISSION/TickTack_v1.1_release.apk` (текущий, обновлён 20 апреля)
  - versionCode: 1 → 2
  - versionName: "1.0" → "1.1"
  - Подпись: debug.keystore (storePassword: 'android', keyAlias: 'androiddebugkey')

### 3. Фикс бага — редактирование напоминания

**Симптом:** при редактировании изменения не сохранялись. Конкретный кейс: убрать переключатель "Напомнить" → сохранить → дата не убирается.

**Причина бага** в `src/screens/AddReminderScreen.tsx`, функция `handleSave`:
```js
// БЫЛО (баг):
let finalDueDate = dueDate;
if (repeat !== 'none') {
  const base = dueDate ?? new Date(); // если dueDate=null, брал new Date()!
  finalDueDate = next; // ставил сегодняшнюю дату вместо null
}

// СТАЛО (фикс):
let finalDueDate = hasDate ? dueDate : null; // если выключено — сразу null
if (repeat !== 'none' && hasDate) { ... }    // repeat-ветка только если дата включена
```

**Дополнительный фикс** в `src/screens/ReminderDetailScreen.tsx`:
```js
// БЫЛО:
navigation.navigate('AddReminder', {reminder})
// СТАЛО:
navigation.push('AddReminder', {reminder})
```
`push` гарантирует создание свежего экрана редактирования (не переиспользует старый стейт).

---

## Архитектура приложения

### Стек
- React Native (New Architecture: Bridgeless + Fabric)
- Android minSdk: 26 (Android 8.0)
- Пакет: `com.ticktack`
- Навигация: `@react-navigation/stack`
- Стейт: кастомный `RemindersStore` (singleton, AsyncStorage, pub/sub)
- Уведомления: `@notifee/react-native`

### Ключевые файлы
| Файл | Назначение |
|------|-----------|
| `src/store/remindersStore.ts` | Хранилище данных (Reminder, ReminderList, CRUD) |
| `src/hooks/useStore.ts` | Реактивный хук подписки на store |
| `src/navigation/AppNavigator.tsx` | Навигационный стек |
| `src/screens/HomeScreen.tsx` | Список напоминаний, фильтры, свайп |
| `src/screens/AddReminderScreen.tsx` | Добавление/редактирование (modal) |
| `src/screens/ReminderDetailScreen.tsx` | Детали напоминания |
| `src/screens/LocationPickerScreen.tsx` | Выбор геолокации для напоминания |
| `src/screens/SettingsScreen.tsx` | Настройки, приватные списки |
| `src/screens/LockScreen.tsx` | Экран блокировки (биометрия) |
| `src/utils/notifications.ts` | Планирование уведомлений (notifee) |
| `src/utils/geolocation.ts` | Геолокация |
| `src/hooks/useLock.ts` | Логика блокировки приложения |
| `index.js` | Точка входа + фоновый обработчик уведомлений |

### Структура Reminder
```ts
interface Reminder {
  id: string;          // UUID
  title: string;
  note: string;
  listId: string;      // 'personal' | 'work' | 'shopping' | custom UUID
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;  // ISO string
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
  subtasks: SubTask[];
  completed: boolean;
  archived: boolean;
  createdAt: string;   // ISO string
  location?: ReminderLocation;
}
```

### Навигационный стек
```
Stack.Navigator (headerShown: false)
├── Home          → HomeScreen
├── AddReminder   → AddReminderScreen  (modal)
├── ReminderDetail → ReminderDetailScreen
├── Settings      → SettingsScreen
├── Archive       → ArchiveScreen
├── Stats         → StatsScreen
└── LocationPicker → LocationPickerScreen  (modal)
```

### Известные особенности
- `DateTimePicker` используется только на iOS (Android несовместим с New Architecture)
- На Android — кастомный picker (Modal с кнопками ▲▼ для дня/месяца/года/часов/минут)
- `location` передаётся из `LocationPickerScreen` через `route.params.onSave` (React state setter — стабильная ссылка, это нормально)
- `store.load()` вызывается при старте в `App.tsx` и в фоновом обработчике уведомлений (`index.js`)
- Подпись релиза через `debug.keystore` (для production нужен production keystore)

---

## Магазины
- Целевые: **APKPure**, **Galaxy Store (Samsung)**, **GetApps (Xiaomi)**
- Google Play пропущен (требует $25)
- Метаданные: `STORE_SUBMISSION/*_metadata.md`
- Иконка: `STORE_SUBMISSION/TickTack_icon_512x512.png` (чёрный фон, белый лого TT)

---

## Незакоммиченные изменения (на момент сессии)
Все изменения из этой сессии (Android-поддержка, фикс редактирования, иконки, стили) не закоммичены.
