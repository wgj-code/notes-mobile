/**
 * ThemeContext.test.tsx — Unit tests for the ThemeContext provider and hooks.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { useThemeColors, useTheme, ThemeProvider } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage is globally mocked in jest.setup.js

// Helper: render a component that reads from the theme context
function ThemeConsumer({
  onRender,
}: {
  onRender: (ctx: ReturnType<typeof useTheme>) => void;
}) {
  const ctx = useTheme();
  onRender(ctx);
  return null;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('ThemeProvider', () => {
    test('provides default theme context (system mode)', () => {
      let captured: ReturnType<typeof useTheme> | null = null;
      render(
        <ThemeProvider>
          <ThemeConsumer onRender={(ctx) => { captured = ctx; }} />
        </ThemeProvider>,
      );
      expect(captured).not.toBeNull();
      expect(captured!.mode).toBe('system');
      expect(typeof captured!.isDark).toBe('boolean');
      expect(captured!.colors).toBeDefined();
    });
  });

  describe('useThemeColors()', () => {
    test('returns colors object with expected keys', () => {
      let colors: any = null;
      render(
        <ThemeProvider>
          <ThemeConsumer onRender={(ctx) => { colors = ctx.colors; }} />
        </ThemeProvider>,
      );
      expect(colors).toBeDefined();
      expect(colors.background).toBeDefined();
      expect(colors.text).toBeDefined();
      expect(colors.primary).toBeDefined();
    });
  });

  describe('useTheme()', () => {
    test('returns mode, isDark, setMode, and colors', () => {
      let ctx: ReturnType<typeof useTheme> | null = null;
      render(
        <ThemeProvider>
          <ThemeConsumer onRender={(c) => { ctx = c; }} />
        </ThemeProvider>,
      );
      expect(ctx!.mode).toBe('system');
      expect(typeof ctx!.isDark).toBe('boolean');
      expect(typeof ctx!.setMode).toBe('function');
      expect(ctx!.colors).toBeDefined();
    });

    test('setMode("dark") switches to dark colors', async () => {
      let ctx: ReturnType<typeof useTheme> | null = null;
      render(
        <ThemeProvider>
          <ThemeConsumer onRender={(c) => { ctx = c; }} />
        </ThemeProvider>,
      );

      await act(async () => {
        await ctx!.setMode('dark');
      });

      expect(ctx!.mode).toBe('dark');
      expect(ctx!.isDark).toBe(true);
      expect(ctx!.colors.background).toBe('#1C1C1E');
    });

    test('setMode("light") switches to light colors', async () => {
      let ctx: ReturnType<typeof useTheme> | null = null;
      render(
        <ThemeProvider>
          <ThemeConsumer onRender={(c) => { ctx = c; }} />
        </ThemeProvider>,
      );

      // First switch to dark, then back to light
      await act(async () => {
        await ctx!.setMode('dark');
      });
      await act(async () => {
        await ctx!.setMode('light');
      });

      expect(ctx!.mode).toBe('light');
      expect(ctx!.isDark).toBe(false);
      expect(ctx!.colors.background).toBe('#FFFFFF');
    });

    test('setMode persists to AsyncStorage', async () => {
      let ctx: ReturnType<typeof useTheme> | null = null;
      render(
        <ThemeProvider>
          <ThemeConsumer onRender={(c) => { ctx = c; }} />
        </ThemeProvider>,
      );

      await act(async () => {
        await ctx!.setMode('dark');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_theme_mode',
        'dark',
      );
    });

    test('loads persisted theme from AsyncStorage on mount', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

      let ctx: ReturnType<typeof useTheme> | null = null;
      render(
        <ThemeProvider>
          <ThemeConsumer onRender={(c) => { ctx = c; }} />
        </ThemeProvider>,
      );

      // Give the useEffect async load a chance to run
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(ctx!.mode).toBe('dark');
      expect(ctx!.isDark).toBe(true);
    });

    test('isDark is false in light mode', async () => {
      let ctx: ReturnType<typeof useTheme> | null = null;
      render(
        <ThemeProvider>
          <ThemeConsumer onRender={(c) => { ctx = c; }} />
        </ThemeProvider>,
      );

      await act(async () => {
        await ctx!.setMode('light');
      });

      expect(ctx!.isDark).toBe(false);
    });
  });
});
