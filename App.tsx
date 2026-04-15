import React, {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import notifee from '@notifee/react-native';
import {AppNavigator} from './src/navigation/AppNavigator';
import {SplashScreen} from './src/screens/SplashScreen';
import {store} from './src/store/remindersStore';
import {ThemeProvider} from './src/theme/ThemeContext';
import {requestNotificationPermission} from './src/utils/notifications';

function AppContent(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    store.load();
    requestNotificationPermission();

    // Сбрасываем бейдж при открытии приложения
    notifee.setBadgeCount(0);

    // Сбрасываем бейдж каждый раз когда приложение становится активным
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        notifee.setBadgeCount(0);
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <>
      <AppNavigator />
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
    </>
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
