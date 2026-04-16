import React, {createContext, useContext, useState, useEffect, useRef} from 'react';
import {Animated, Easing} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ThemeMode, ThemeColors, themes} from './index';

const BG_IMAGE_KEY = '@ticktack_bg_image';
const ACCENT_KEY = '@ticktack_accent';

export const ACCENT_COLORS = [
  {color: '#00d4ff', name: 'Океан'},
  {color: '#3b82f6', name: 'Синий'},
  {color: '#a855f7', name: 'Фиолетовый'},
  {color: '#ec4899', name: 'Розовый'},
  {color: '#f97316', name: 'Оранжевый'},
  {color: '#4cd97b', name: 'Зелёный'},
  {color: '#f5c842', name: 'Жёлтый'},
  {color: '#ffffff', name: 'Белый'},
];

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
  backgroundImage: string | null;
  setBackgroundImage: (uri: string | null) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  fadeAnim: Animated.Value;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: themes.dark,
  toggle: () => {},
  backgroundImage: null,
  setBackgroundImage: () => {},
  accentColor: ACCENT_COLORS[0].color,
  setAccentColor: () => {},
  fadeAnim: new Animated.Value(1),
});

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [backgroundImage, setBackgroundImageState] = useState<string | null>(null);
  const [accentColor, setAccentColorState] = useState(ACCENT_COLORS[0].color);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem('@ticktack_theme').then(v => {
      if (v === 'light' || v === 'dark') setMode(v);
    });
    AsyncStorage.getItem(BG_IMAGE_KEY).then(v => {
      if (v) setBackgroundImageState(v);
    });
    AsyncStorage.getItem(ACCENT_KEY).then(v => {
      if (v) setAccentColorState(v);
    });
  }, []);

  const toggle = () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Меняем тему в середине анимации — когда экран полностью скрыт
    setTimeout(() => {
      setMode(next);
      AsyncStorage.setItem('@ticktack_theme', next);
    }, 180);
  };

  const setBackgroundImage = async (uri: string | null) => {
    setBackgroundImageState(uri);
    if (uri) {
      await AsyncStorage.setItem(BG_IMAGE_KEY, uri);
    } else {
      await AsyncStorage.removeItem(BG_IMAGE_KEY);
    }
  };

  const setAccentColor = async (color: string) => {
    setAccentColorState(color);
    await AsyncStorage.setItem(ACCENT_KEY, color);
  };

  const colors: ThemeColors = {
    ...themes[mode],
    accent: accentColor,
  };

  return (
    <ThemeContext.Provider value={{
      mode, colors, toggle,
      backgroundImage, setBackgroundImage,
      accentColor, setAccentColor,
      fadeAnim,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
