/**
 * i18n setup for notes-mobile.
 *
 * Uses expo-localization + i18n-js to detect the device language and provide
 * a `t()` function for translated strings. Chinese (zh) and English (en)
 * are supported; English is the fallback.
 *
 * Language choice is persisted to AsyncStorage so it survives app restarts.
 * On first launch, the device system language is used.
 *
 * Usage in screens:
 *   import { t } from '@/i18n';
 *   <Text>{t('auth.welcomeBack')}</Text>
 *
 * Switch language programmatically:
 *   import { setLanguage, getLanguage } from '@/i18n';
 *   await setLanguage('zh');   // switch to Chinese
 *   await setLanguage('en');   // switch to English
 *
 * Interpolation (use {{key}} placeholders in JSON):
 *   t('notes.confirmDelete', { title: note.title })
 */

import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import zh from './zh.json';

// ── Constants ─────────────────────────────────────────────────────────
const LANGUAGE_KEY = '@app_language';

// ── Create i18n instance ──────────────────────────────────────────────
const i18n = new I18n({ en, zh });

// ── Language detection ────────────────────────────────────────────────
// expo-localization returns device locale tags like "zh-CN", "en-US".
// i18n-js matches on the first two characters, so "zh-CN" resolves to "zh".
function resolveLanguageTag(): string {
  const tag = Localization.getLocales()?.[0]?.languageCode ?? 'en';
  return tag.startsWith('zh') ? 'zh' : 'en';
}

i18n.defaultLocale = 'en';
i18n.enableFallback = true; // falls back to en if a key is missing in zh

// ── Init: load persisted language from AsyncStorage ────────────────────
async function loadPersistedLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'zh') {
      i18n.locale = stored;
      return;
    }
  } catch {
    // AsyncStorage read failed, fall through to system language
  }
  i18n.locale = resolveLanguageTag();
}

// Set initial locale synchronously (system language), then override async
i18n.locale = resolveLanguageTag();
loadPersistedLanguage();

// ── Public API ────────────────────────────────────────────────────────

/** Translate a key, with optional interpolation params. */
export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}

/** Get the currently active language code ('en' or 'zh'). */
export function getLanguage(): string {
  return i18n.locale;
}

/**
 * Switch language at runtime and persist the choice to AsyncStorage.
 * Components calling `t()` will re-render if they re-evaluate `t()`.
 */
export async function setLanguage(lang: 'en' | 'zh'): Promise<void> {
  i18n.locale = lang;
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // AsyncStorage write failed; language still changed for this session
  }
}

export default i18n;
