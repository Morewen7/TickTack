import {useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';

export const LOCK_KEY = '@ticktack_lock_enabled';
const LOCK_TIMEOUT_MS = 60 * 1000; // 60 секунд фона = снова блокировать

const rnBiometrics = new ReactNativeBiometrics();

export function useLock() {
  const [lockEnabled, setLockEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const bgTimestamp = useRef<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LOCK_KEY).then(async v => {
      const enabled = v === 'true';
      setLockEnabled(enabled);
      if (enabled) {
        // Only lock if biometrics are actually available
        const {available} = await rnBiometrics.isSensorAvailable();
        if (available) setLocked(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!lockEnabled) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        bgTimestamp.current = Date.now();
      } else if (state === 'active') {
        const elapsed = bgTimestamp.current ? Date.now() - bgTimestamp.current : Infinity;
        if (elapsed > LOCK_TIMEOUT_MS) {
          rnBiometrics.isSensorAvailable().then(({available}) => {
            if (available) setLocked(true);
          });
        }
        bgTimestamp.current = null;
      }
    });
    return () => sub.remove();
  }, [lockEnabled]);

  const enableLock = async (enabled: boolean) => {
    setLockEnabled(enabled);
    await AsyncStorage.setItem(LOCK_KEY, String(enabled));
    if (!enabled) setLocked(false);
  };

  const unlock = () => setLocked(false);

  return {lockEnabled, locked, enableLock, unlock};
}
