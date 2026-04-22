import React, {useEffect, useState} from 'react';
import {Animated} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppNavigator} from './src/navigation/AppNavigator';
import {SplashScreen} from './src/screens/SplashScreen';
import {OnboardingScreen, ONBOARDING_KEY} from './src/screens/OnboardingScreen';
import {store} from './src/store/remindersStore';
import {ThemeProvider, useTheme} from './src/theme/ThemeContext';
import {requestNotificationPermission, setupNotificationActions, registerNotificationHandlers, syncNotifications, displayGeofenceNotification} from './src/utils/notifications';
import {startGeofenceMonitor} from './src/utils/geolocation';
import {LockScreen} from './src/screens/LockScreen';
import {useLock} from './src/hooks/useLock';

function AppContent(): React.JSX.Element {
  const {fadeAnim} = useTheme();
  const {locked, unlock} = useLock();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const geofenceTrigger = (r: Parameters<typeof displayGeofenceNotification>[0]) =>
      displayGeofenceNotification(r).catch(() => {});

    const setupGeofence = () => {
      try {
        const locationCount = store.getState().reminders.filter(
          r => !r.completed && !r.archived && r.location,
        ).length;
        if (locationCount > 0) {
          startGeofenceMonitor(() => store.getState().reminders, geofenceTrigger);
        }
      } catch (e) {
        if (__DEV__) { console.error('[Geofence] setup error:', e); }
      }
    };

    store.load().then(() => {
      const reminders = store.getState().reminders;
      syncNotifications(reminders);
      store.refreshSync();
      setupGeofence();
    });

    // Перезапускаем геозоны когда пользователь добавляет location-напоминание
    let prevLocationCount = 0;
    const unsubscribe = store.subscribe(() => {
      try {
        const locationCount = store.getState().reminders.filter(
          r => !r.completed && !r.archived && r.location,
        ).length;
        if (locationCount > prevLocationCount) {
          startGeofenceMonitor(() => store.getState().reminders, geofenceTrigger);
        }
        prevLocationCount = locationCount;
      } catch (e) {
        if (__DEV__) { console.error('[Geofence] subscriber error:', e); }
      }
    });

    requestNotificationPermission();
    setupNotificationActions();
    registerNotificationHandlers(store);
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      if (!val) setShowOnboarding(true);
      setReady(true);
    });

    return unsubscribe;
  }, []);

  return (
    <Animated.View style={{flex: 1, opacity: fadeAnim}}>
      <AppNavigator />
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}
      {ready && showOnboarding && !showSplash && (
        <OnboardingScreen onFinish={() => setShowOnboarding(false)} />
      )}
      {locked && !showSplash && <LockScreen onUnlock={unlock} />}
    </Animated.View>
  );
}

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
