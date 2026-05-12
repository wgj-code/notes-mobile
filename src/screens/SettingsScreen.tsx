import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';
import { spacing, fontSize, borderRadius } from '../lib/theme';
import { useThemeColors, useTheme } from '../contexts/ThemeContext';
import { t, getLanguage, setLanguage } from '../i18n';

type ThemeMode = 'system' | 'light' | 'dark';
const THEME_OPTIONS: { key: ThemeMode; labelKey: string }[] = [
  { key: 'system', labelKey: 'settings.themeSystem' },
  { key: 'light', labelKey: 'settings.themeLight' },
  { key: 'dark', labelKey: 'settings.themeDark' },
];

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { session, signOut } = useAuthStore();
  const [lang, setLang] = useState<'en' | 'zh'>(getLanguage() as 'en' | 'zh');

  const styles = makeStyles(colors);

  const handleSignOut = () => {
    Alert.alert(t('settings.signOut'), t('settings.confirmSignOut'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const handleLanguageChange = useCallback(async (newLang: 'en' | 'zh') => {
    if (newLang === lang) return;
    await setLanguage(newLang);
    setLang(newLang);
  }, [lang]);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>{t('settings.account')}</Text>
        <Text style={styles.value}>{session?.user?.email ?? '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('settings.language')}</Text>
        <View style={styles.languageRow}>
          <TouchableOpacity
            style={[styles.langOption, lang === 'en' && styles.langOptionActive]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>
              {t('settings.languageEn')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langOption, lang === 'zh' && styles.langOptionActive]}
            onPress={() => handleLanguageChange('zh')}
          >
            <Text style={[styles.langText, lang === 'zh' && styles.langTextActive]}>
              {t('settings.languageZh')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('settings.theme')}</Text>
        <View style={styles.languageRow}>
          {THEME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.langOption, themeMode === opt.key && styles.langOptionActive]}
              onPress={() => setThemeMode(opt.key)}
            >
              <Text style={[styles.langText, themeMode === opt.key && styles.langTextActive]}>
                {t(opt.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('settings.feedbackButton')}</Text>
        <Text style={styles.value}>{t('settings.feedbackButtonDesc')}</Text>
        <TouchableOpacity
          style={[styles.langOption, styles.langOptionActive]}
          onPress={async () => {
            await AsyncStorage.removeItem('feedback-button-hidden');
            Alert.alert(t('settings.showFeedbackButton'), t('settings.feedbackButtonDesc'));
          }}
        >
          <Text style={[styles.langText, styles.langTextActive]}>
            {t('settings.showFeedbackButton')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
        <Text style={styles.dangerText}>{t('settings.signOut')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: spacing.xl },
    section: { marginBottom: spacing.xl },
    label: { fontSize: fontSize.sm, color: c.textMuted, textTransform: 'uppercase', marginBottom: spacing.xs },
    value: { fontSize: fontSize.lg, color: c.text, fontWeight: '500' },
    languageRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    langOption: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: borderRadius.sm,
      padding: spacing.md,
      alignItems: 'center',
    },
    langOptionActive: {
      borderColor: c.primary,
      backgroundColor: c.activeOptionBg,
    },
    langText: {
      fontSize: fontSize.md,
      color: c.textSecondary,
      fontWeight: '500',
    },
    langTextActive: {
      color: c.primary,
      fontWeight: '600',
    },
    dangerButton: {
      borderWidth: 1, borderColor: c.danger, borderRadius: borderRadius.sm,
      padding: spacing.lg, alignItems: 'center',
    },
    dangerText: { color: c.danger, fontSize: fontSize.lg, fontWeight: '600' },
  });
}
