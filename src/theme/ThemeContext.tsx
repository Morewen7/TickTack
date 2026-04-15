import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ThemeMode, ThemeColors, themes} from './index';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: themes.dark,
  toggle: () => {},
});

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem('@ticktack_theme').then(v => {
      if (v === 'light' || v === 'dark') setMode(v);
    });
  }, []);

  const toggle = async () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    await AsyncStorage.setItem('@ticktack_theme', next);
  };

  return (
    <ThemeContext.Provider value={{mode, colors: themes[mode], toggle}}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
