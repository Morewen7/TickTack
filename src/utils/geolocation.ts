import Geolocation from '@react-native-community/geolocation';
import {Alert, PermissionsAndroid, Platform} from 'react-native';
import {ReminderLocation} from '../store/remindersStore';

export function requestLocationPermission(): Promise<boolean> {
  return new Promise(resolve => {
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization('whenInUse');
      resolve(true);
      return;
    }
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ).then(result => resolve(result === 'granted'));
  });
}

export function getCurrentLocation(): Promise<{latitude: number; longitude: number}> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
      err => reject(err),
      {enableHighAccuracy: true, timeout: 10000},
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
let locationCallbacks: Array<(lat: number, lon: number) => void> = [];

export function startLocationWatch(cb: (lat: number, lon: number) => void) {
  locationCallbacks.push(cb);
  if (watchId !== null) return;
  watchId = Geolocation.watchPosition(
    pos => {
      locationCallbacks.forEach(f => f(pos.coords.latitude, pos.coords.longitude));
    },
    () => {},
    {distanceFilter: 50, interval: 60000},
  );
}

export function stopLocationWatch() {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
    locationCallbacks = [];
  }
}
