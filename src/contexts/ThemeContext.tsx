import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useRNColorScheme, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemeColors } from '../lib/theme';

type ThemeMode = 'system' | 'light' | 'dark';
const THEME_KEY = '@app_theme_mode';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  colors: lightColors,
  isDark: false,
  setMode: () => {},
});

function resolveIsDark(mode: ThemeMode, systemScheme: string | null | undefined): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemScheme === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          setModeState(stored);
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const isDark = resolveIsDark(mode, systemScheme);
  const colors = isDark ? darkColors : lightColors;

  // Update StatusBar whenever theme changes
  useEffect(() => {
    StatusBar.setBarStyle(colors.statusBar, true);
  }, [colors.statusBar]);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode);
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Get the current theme colors (light or dark). */
export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

/** Get full theme info including mode, isDark, and setMode. */
export function useTheme() {
  return useContext(ThemeContext);
}
