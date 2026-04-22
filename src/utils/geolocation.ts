import Geolocation from '@react-native-community/geolocation';
import {PermissionsAndroid, Platform} from 'react-native';
import type {Reminder, ReminderLocation} from '../store/remindersStore';

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // requestAuthorization показывает системный диалог.
    // Проверяем реальный статус через короткий тестовый вызов.
    Geolocation.requestAuthorization('whenInUse');
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        {enableHighAccuracy: false, timeout: 5000, maximumAge: 60000},
      );
    });
  }

  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Геолокация',
      message: 'TickTack использует геолокацию чтобы напомнить о задаче в нужном месте',
      buttonPositive: 'Разрешить',
      buttonNegative: 'Отмена',
    },
  );
  if (fine !== 'granted') return false;

  // Android 10+ — фоновая геолокация опциональна, не блокируем если отказали
  if (Platform.Version >= 29) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Фоновая геолокация',
        message: 'Разреши "Всегда" чтобы получать напоминания по месту в фоне. Можно пропустить.',
        buttonPositive: 'Разрешить',
        buttonNegative: 'Пропустить',
      },
    );
  }

  return true; // Возвращаем true даже без фоновой — основная геолокация работает
}

export function getCurrentLocation(): Promise<{latitude: number; longitude: number}> {
  return new Promise((resolve, reject) => {
    // Сначала пробуем сетевую геолокацию (быстро, работает без GPS-сигнала)
    Geolocation.getCurrentPosition(
      pos => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
      () => {
        // Fallback: GPS с увеличенным таймаутом
        Geolocation.getCurrentPosition(
          pos => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
          err => reject(err),
          {enableHighAccuracy: true, timeout: 30000, maximumAge: 60000},
        );
      },
      {enableHighAccuracy: false, timeout: 10000, maximumAge: 30000},
    );
  });
}

// Простая проверка расстояния (Haversine)
export function distanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Запускает мониторинг геозоны — вызывать при добавлении location-reminder
let watchId: number | null = null;
let locationCallbacks: Set<(lat: number, lon: number) => void> = new Set();

export function startLocationWatch(cb: (lat: number, lon: number) => void) {
  locationCallbacks.add(cb); // Set автоматически дедуплицирует
  if (watchId !== null) return;
  watchId = Geolocation.watchPosition(
    pos => {
      locationCallbacks.forEach(f => f(pos.coords.latitude, pos.coords.longitude));
    },
    () => {},
    {distanceFilter: 50, interval: 60000},
  );
}

/**
 * Удаляет конкретный колбэк из наблюдателей.
 * Если передан cb — удаляет только его (watch продолжается для остальных).
 * Без аргумента — останавливает watch полностью.
 */
export function stopLocationWatch(cb?: (lat: number, lon: number) => void) {
  if (cb) {
    locationCallbacks.delete(cb);
    if (locationCallbacks.size > 0) return; // ещё есть слушатели — watch продолжается
  }
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
    locationCallbacks.clear();
  }
}

// Геозоны которые уже сработали — сбрасываются при выходе из зоны
const geoFired = new Set<string>();
// Текущий обработчик монитора — для идемпотентного перезапуска
let geofenceHandler: ((lat: number, lon: number) => void) | null = null;

/**
 * Запускает (или перезапускает) глобальный монитор геозон.
 * Идемпотентен — безопасно вызывать повторно при добавлении новых location-напоминаний.
 * getReminders — функция получения актуального списка напоминаний из стора.
 * onTrigger — вызывается когда пользователь входит/выходит из геозоны напоминания.
 */
export function startGeofenceMonitor(
  getReminders: () => Reminder[],
  onTrigger: (reminder: Reminder) => void,
) {
  // Снимаем предыдущий обработчик если был
  if (geofenceHandler) {
    stopLocationWatch(geofenceHandler);
  }
  geofenceHandler = (lat: number, lon: number) => {
    for (const r of getReminders()) {
      if (r.completed || r.archived || !r.location) continue;
      const dist = distanceMeters(lat, lon, r.location.latitude, r.location.longitude);
      const inside = dist <= r.location.radius;
      const shouldFire = r.location.onArrive ? inside : !inside;
      if (shouldFire && !geoFired.has(r.id)) {
        geoFired.add(r.id);
        onTrigger(r);
      } else if (!shouldFire) {
        geoFired.delete(r.id); // сбрасываем чтобы можно было сработать снова
      }
    }
  };
  startLocationWatch(geofenceHandler);
}
