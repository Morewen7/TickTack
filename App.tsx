import React, {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import {Animated} from 'react-native';
import {AppNavigator} from './src/navigation/AppNavigator';
import {SplashScreen} from './src/screens/SplashScreen';
import {OnboardingScreen, ONBOARDING_KEY} from './src/screens/OnboardingScreen';
import {store} from './src/store/remindersStore';
import {ThemeProvider, useTheme} from './src/theme/ThemeContext';
import {requestNotificationPermission, setupNotificationActions, registerNotificationHandlers} from './src/utils/notifications';
import {LockScreen} from './src/screens/LockScreen';
import {useLock} from './src/hooks/useLock';

function updateBadge() {
  const {reminders} = store.getState();
  const count = reminders.filter(r => !r.completed && !r.archived).length;
  notifee.setBadgeCount(count);
}

function AppContent(): React.JSX.Element {
  const {fadeAnim} = useTheme();
  const {locked, unlock} = useLock();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    store.load().then(() => updateBadge());
    requestNotificationPermission();
    setupNotificationActions();
    registerNotificationHandlers(store);
    const unsubStore = store.subscribe(updateBadge);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') notifee.setBadgeCount(0);
    });
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      if (!val) setShowOnboarding(true);
      setReady(true);
    });
    return () => {
      unsubStore();
      sub.remove();
    };
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
