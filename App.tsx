import React, {useEffect, useState} from 'react';
import {Animated, AppState as RNAppState} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppNavigator} from './src/navigation/AppNavigator';
import {SplashScreen} from './src/screens/SplashScreen';
import {OnboardingScreen, ONBOARDING_KEY} from './src/screens/OnboardingScreen';
import {store} from './src/store/remindersStore';
import {ThemeProvider, useTheme} from './src/theme/ThemeContext';
import {
  requestNotificationPermission,
  setupNotificationActions,
  registerNotificationHandlers,
  syncNotifications,
  displayGeofenceNotification,
} from './src/utils/notifications';
import {startGeofenceMonitor} from './src/utils/geolocation';
import {syncHealthReminders} from './src/utils/health';
import {LockScreen} from './src/screens/LockScreen';
import {useLock} from './src/hooks/useLock';
import {ErrorBoundary} from './src/components/ErrorBoundary';

function AppContent(): React.JSX.Element {
  const {fadeAnim} = useTheme();
  const {locked, unlock} = useLock();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const geofenceTrigger = (
      r: Parameters<typeof displayGeofenceNotification>[0],
    ) => displayGeofenceNotification(r).catch(() => {});

    const setupGeofence = () => {
      try {
        const locationCount = store
          .getState()
          .reminders.filter(
            r => !r.completed && !r.archived && r.location,
          ).length;
        if (locationCount > 0) {
          startGeofenceMonitor(
            () => store.getState().reminders,
            geofenceTrigger,
          );
        }
      } catch (e) {
        if (__DEV__) {
          console.error('[Geofence] setup error:', e);
        }
      }
    };

    store.load().then(() => {
      const reminders = store.getState().reminders;
      syncNotifications(reminders);
      syncHealthReminders().catch(() => {});
      store.refreshSync();
      setupGeofence();
    });

    // Перезапускаем геозоны когда пользователь добавляет location-напоминание
    let prevLocationCount = 0;
    const unsubscribe = store.subscribe(() => {
      try {
        const locationCount = store
          .getState()
          .reminders.filter(
            r => !r.completed && !r.archived && r.location,
          ).length;
        if (locationCount > prevLocationCount) {
          startGeofenceMonitor(
            () => store.getState().reminders,
            geofenceTrigger,
          );
        }
        prevLocationCount = locationCount;
      } catch (e) {
        if (__DEV__) {
          console.error('[Geofence] subscriber error:', e);
        }
      }
    });

    requestNotificationPermission();
    setupNotificationActions();
    registerNotificationHandlers(store);
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      if (!val) {setShowOnboarding(true);}
      setReady(true);
    });

    let prevAppState = RNAppState.currentState;
    const appStateSub = RNAppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        store.flush();
      }
      // On foreground: re-sync notifications + restart geofence if it may have died
      if (
        nextState === 'active' &&
        (prevAppState === 'background' || prevAppState === 'inactive')
      ) {
        syncNotifications(store.getState().reminders);
        setupGeofence();
      }
      prevAppState = nextState;
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return (
    <Animated.View style={{flex: 1, opacity: fadeAnim}}>
      <AppNavigator />
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {ready && showOnboarding && !showSplash && (
        <OnboardingScreen onFinish={() => setShowOnboarding(false)} />
      )}
      {locked && !showSplash && <LockScreen onUnlock={unlock} />}
    </Animated.View>
  );
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default App;
