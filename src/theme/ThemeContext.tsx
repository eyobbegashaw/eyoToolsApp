import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, ThemeMode, FontSize } from '../types';
import { translations, Translations } from '../localization/translations';

export interface ThemeFonts {
  regular: string;
  medium: string;
  bold: string;
}

export const getThemeFonts = (language: Language): ThemeFonts => {
  if (language === 'am') {
    return {
      regular: Platform.OS === 'web' ? "'Noto Serif Ethiopic', serif" : 'NotoSerifEthiopic-Regular',
      medium: Platform.OS === 'web' ? "'Noto Serif Ethiopic', serif" : 'NotoSerifEthiopic-Regular',
      bold: Platform.OS === 'web' ? "'Noto Serif Ethiopic', serif" : 'NotoSerifEthiopic-Bold',
    };
  }
  return {
    regular: Platform.OS === 'web' ? "'Ubuntu', sans-serif" : 'Ubuntu-Regular',
    medium: Platform.OS === 'web' ? "'Ubuntu', sans-serif" : 'Ubuntu-Medium',
    bold: Platform.OS === 'web' ? "'Ubuntu', sans-serif" : 'Ubuntu-Bold',
  };
};

export interface ThemeColors {
  background: string;
  card: string;
  cardSecondary: string;
  cardBorder: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  cyan: string;
  teal: string;
  emerald: string;
  amber: string;
  purple: string;
  rose: string;
  danger: string;
  headerBg: string;
  navBg: string;
  inputBg: string;
}

const darkColors: ThemeColors = {
  background: '#090d16',
  card: '#111827',
  cardSecondary: '#1f293d',
  cardBorder: '#1e293b',
  border: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#0284c7',
  primaryDark: '#0369a1',
  primaryLight: '#38bdf8',
  cyan: '#06b6d4',
  teal: '#0d9488',
  emerald: '#10b981',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  rose: '#f43f5e',
  danger: '#ef4444',
  headerBg: '#0b1120',
  navBg: '#0b1120',
  inputBg: '#1e293b',
};

const lightColors: ThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  cardSecondary: '#f1f5f9',
  cardBorder: '#e2e8f0',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#0284c7',
  primaryDark: '#0369a1',
  primaryLight: '#38bdf8',
  cyan: '#0891b2',
  teal: '#0f766e',
  emerald: '#059669',
  amber: '#d97706',
  purple: '#7c3aed',
  rose: '#e11d48',
  danger: '#dc2626',
  headerBg: '#ffffff',
  navBg: '#ffffff',
  inputBg: '#f8fafc',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  language: Language;
  fontSize: FontSize;
  fontScale: number;
  colors: ThemeColors;
  fonts: ThemeFonts;
  t: Translations;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  THEME: '@eyotools_theme_mode',
  LANGUAGE: '@eyotools_language',
  FONT_SIZE: '@eyotools_font_size',
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();

  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [language, setLanguageState] = useState<Language>('en');
  const [fontSize, setFontSizeState] = useState<FontSize>('normal');

  useEffect(() => {
    // Load persisted preferences
    const loadSettings = async () => {
      try {
        const [savedTheme, savedLang, savedFontSize] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.THEME),
          AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
          AsyncStorage.getItem(STORAGE_KEYS.FONT_SIZE),
        ]);

        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system')) {
          setThemeModeState(savedTheme as ThemeMode);
        }
        if (savedLang && (savedLang === 'en' || savedLang === 'am')) {
          setLanguageState(savedLang as Language);
        }
        if (savedFontSize && (savedFontSize === 'small' || savedFontSize === 'normal' || savedFontSize === 'large')) {
          setFontSizeState(savedFontSize as FontSize);
        }
      } catch (e) {
        console.warn('Failed to load settings from storage', e);
      }
    };

    loadSettings();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, mode);
    } catch (e) {
      console.warn('Error saving theme', e);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (e) {
      console.warn('Error saving language', e);
    }
  };

  const setFontSize = async (size: FontSize) => {
    setFontSizeState(size);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);
    } catch (e) {
      console.warn('Error saving font size', e);
    }
  };

  const isDark =
    themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  const fontScale = fontSize === 'small' ? 0.9 : fontSize === 'large' ? 1.15 : 1.0;
  const colors = isDark ? darkColors : lightColors;
  const fonts = getThemeFonts(language);
  const t = translations[language] || translations.en;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        language,
        fontSize,
        fontScale,
        colors,
        fonts,
        t,
        setThemeMode,
        setLanguage,
        setFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
