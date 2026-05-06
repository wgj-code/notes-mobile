import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';
import { t, getLanguage, setLanguage } from '../i18n';

export default function SettingsScreen() {
  const { session, signOut } = useAuthStore();
  const [lang, setLang] = useState<'en' | 'zh'>(getLanguage() as 'en' | 'zh');

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

      <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
        <Text style={styles.dangerText}>{t('settings.signOut')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  section: { marginBottom: spacing.xl },
  label: { fontSize: fontSize.sm, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.xs },
  value: { fontSize: fontSize.lg, color: colors.text, fontWeight: '500' },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  langOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  langOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0F5FF',
  },
  langText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  langTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  dangerButton: {
    borderWidth: 1, borderColor: colors.danger, borderRadius: borderRadius.sm,
    padding: spacing.lg, alignItems: 'center',
  },
  dangerText: { color: colors.danger, fontSize: fontSize.lg, fontWeight: '600' },
});
