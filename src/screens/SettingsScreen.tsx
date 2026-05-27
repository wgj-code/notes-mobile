import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/authStore';
import { useNotesStore } from '../stores/notesStore';
import { spacing, fontSize, borderRadius } from '../lib/theme';
import { useThemeColors, useTheme } from '../contexts/ThemeContext';
import { t, getLanguage, setLanguage } from '../i18n';
import SpeechPlayer from '../components/SpeechPlayer';
import { logger } from '../lib/logger';
import { useVersionCheck } from '../hooks/useVersionCheck';

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
  const { notes } = useNotesStore();
  const [lang, setLang] = useState<'en' | 'zh'>(getLanguage() as 'en' | 'zh');
  const [showSpeech, setShowSpeech] = useState(false);

  const styles = makeStyles(colors);
  const { checking: versionChecking, result: versionResult, localVersion, checkForUpdate, applyOTAUpdate, downloadAPK } = useVersionCheck();

  const handleCheckUpdate = async () => {
    const res = await checkForUpdate();
    if (!res) { Alert.alert('检查更新', '检查失败，请检查网络'); return; }
    if (res.hasAPKUpdate) {
      Alert.alert('有新版本', `最新版本 ${res.version.current}\n${res.version.releaseNote}\n\n需要下载新版本安装`, [
        { text: '取消', style: 'cancel' },
        { text: '下载更新', onPress: () => downloadAPK(res.version.apkUrl) },
      ]);
    } else if (res.hasOTAUpdate) {
      Alert.alert('有新版本', `最新版本 ${res.version.current}\n${res.version.releaseNote}\n\n点击更新（秒级完成）`, [
        { text: '取消', style: 'cancel' },
        { text: '立即更新', onPress: async () => {
          const ok = await applyOTAUpdate();
          if (!ok) Alert.alert('更新失败', 'OTA 更新未成功，请稍后重试或重新安装');
        }},
      ]);
    } else {
      Alert.alert('检查更新', '已是最新版本');
    }
  };

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

  const handleExportAll = useCallback(async () => {
    if (notes.length === 0) {
      Alert.alert('', t('settings.noNotesToExport'));
      return;
    }
    try {
      const combined = notes
        .map((note) => `# ${note.title}\n\n${note.content}`)
        .join('\n\n---\n\n');
      const filePath = `${FileSystem.cacheDirectory}notes-export.md`;
      await FileSystem.writeAsStringAsync(filePath, combined, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert(t('settings.exportAll'), t('common.error'));
      }
    } catch {
      Alert.alert(t('settings.exportAll'), t('settings.exportFailed'));
    }
  }, [notes]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}>
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
        <Text style={[styles.value, { marginBottom: spacing.sm }]}>{t('settings.feedbackButtonDesc')}</Text>
        <View style={styles.languageRow}>
          <TouchableOpacity
            style={styles.langOption}
            onPress={async () => {
              await AsyncStorage.removeItem('feedback-button-hidden');
              Alert.alert('', t('settings.showFeedbackButton'));
            }}
          >
            <Text style={styles.langText}>{t('settings.showFeedbackButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.langOption}
            onPress={async () => {
              await AsyncStorage.setItem('feedback-button-hidden', 'true');
              Alert.alert('', t('settings.hideFeedbackButton'));
            }}
          >
            <Text style={styles.langText}>{t('settings.hideFeedbackButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('speech.title')}</Text>
        <Text style={[styles.value, { marginBottom: spacing.sm }]}>{t('speech.description')}</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowSpeech(true)}>
          <Text style={styles.actionButtonText}>{t('speech.startListening')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('settings.exportAll')}</Text>
        <Text style={[styles.value, { marginBottom: spacing.sm }]}>{t('settings.exportAllDesc')}</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleExportAll}>
          <Text style={styles.actionButtonText}>{t('settings.exportAll')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>日志回传</Text>
        <Text style={[styles.value, { marginBottom: spacing.sm }]}>出现闪退等问题时自动上报日志</Text>
        <TouchableOpacity style={styles.actionButton} onPress={async () => {
          logger.event('SettingsScreen', 'Manual log upload triggered');
          const result = await logger.flush();
          Alert.alert('日志回传', `上报结果: ${result}`);
        }}>
          <Text style={styles.actionButtonText}>立即上报日志</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('settings.about')}</Text>
        <Text style={styles.value}>{t('settings.version')} {Constants.expoConfig?.version ?? '0.1.0'}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCheckUpdate} disabled={versionChecking}>
            <Text style={styles.actionButtonText}>{versionChecking ? '检查中...' : '检查更新'}</Text>
          </TouchableOpacity>
          {versionResult && (
            <Text style={[styles.value, { fontSize: fontSize.sm, marginTop: spacing.xs, color: colors.textSecondary }]}>
              最新版本: {versionResult.latestVersion} | 当前版本: {localVersion}
            </Text>
          )}
        </View>
      </View>

      <View style={{ height: spacing.xxl }} />

      <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
        <Text style={styles.dangerText}>{t('settings.signOut')}</Text>
      </TouchableOpacity>

      <SpeechPlayer visible={showSpeech} onClose={() => setShowSpeech(false)} />
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { backgroundColor: c.background },
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
    actionButton: {
      backgroundColor: c.primary,
      borderRadius: borderRadius.sm,
      padding: spacing.lg,
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#ffffff',
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    dangerButton: {
      borderWidth: 1, borderColor: c.danger, borderRadius: borderRadius.sm,
      padding: spacing.lg, alignItems: 'center',
    },
    dangerText: { color: c.danger, fontSize: fontSize.lg, fontWeight: '600' },
  });
}
