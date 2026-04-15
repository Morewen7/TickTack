export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  card: string;
  cardBorder: string;
  blurType: 'dark' | 'light' | 'extraDark';
  blurAmount: number;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  separator: string;
  overlay: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  switchTrack: string;
}

const dark: ThemeColors = {
  bg: '#111111',
  bgSecondary: '#1c1c1c',
  card: '#1e1e1e',
  cardBorder: 'rgba(255,255,255,0.08)',
  blurType: 'dark',
  blurAmount: 20,
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.28)',
  accent: '#ffffff',
  separator: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(0,0,0,0.8)',
  priorityHigh: '#ff5c5c',
  priorityMedium: '#f5c842',
  priorityLow: '#4cd97b',
  switchTrack: '#333333',
};

const light: ThemeColors = {
  bg: '#f0f0f0',
  bgSecondary: '#e4e4e4',
  card: '#ffffff',
  cardBorder: 'rgba(0,0,0,0.06)',
  blurType: 'light',
  blurAmount: 20,
  textPrimary: '#111111',
  textSecondary: 'rgba(0,0,0,0.5)',
  textMuted: 'rgba(0,0,0,0.3)',
  accent: '#111111',
  separator: 'rgba(0,0,0,0.07)',
  overlay: 'rgba(0,0,0,0.4)',
  priorityHigh: '#e53935',
  priorityMedium: '#f9a825',
  priorityLow: '#2e7d32',
  switchTrack: '#c0c0c0',
};

export const themes = {dark, light};

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
