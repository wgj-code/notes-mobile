/**
 * i18n.test.ts — Unit tests for the i18n module (language detection, translation, persistence).
 */

// Mock expo-localization before importing the module
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

// AsyncStorage is globally mocked in jest.setup.js

import { t, getLanguage, setLanguage } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('i18n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default English
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('t()', () => {
    test('returns translated text for a valid key', () => {
      const result = t('common.error');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('returns English translation by default', () => {
      const result = t('auth.login');
      expect(result).toBe('Login');
    });

    test('returns fallback text for a non-existent key', () => {
      const result = t('nonexistent.deeply.nested.key');
      // i18n-js with enableFallback returns the key itself when not found
      expect(typeof result).toBe('string');
    });

    test('handles interpolation params', () => {
      const result = t('notes.confirmDelete', { title: 'My Note' });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getLanguage()', () => {
    test('returns current language code', () => {
      const lang = getLanguage();
      expect(typeof lang).toBe('string');
      expect(['en', 'zh']).toContain(lang);
    });
  });

  describe('setLanguage()', () => {
    test('switches language to zh', async () => {
      await setLanguage('zh');
      expect(getLanguage()).toBe('zh');
    });

    test('switches language to en', async () => {
      await setLanguage('zh');
      await setLanguage('en');
      expect(getLanguage()).toBe('en');
    });

    test('persists language choice to AsyncStorage', async () => {
      await setLanguage('zh');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_language',
        'zh',
      );
    });

    test('returns translated text after language switch', async () => {
      await setLanguage('zh');
      const result = t('auth.login');
      expect(result).toBe('登录');
    });

    test('returns English text after switching back to en', async () => {
      await setLanguage('zh');
      await setLanguage('en');
      const result = t('auth.login');
      expect(result).toBe('Login');
    });
  });
});
