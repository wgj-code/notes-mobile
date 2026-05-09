import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';

export default function EmptyState() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📝</Text>
      <Text style={styles.title}>{t('notes.noNotesYet')}</Text>
      <Text style={styles.subtitle}>{t('notes.tapToCreate')}</Text>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
    icon: { fontSize: 48, marginBottom: spacing.xl },
    title: { fontSize: fontSize.xl, fontWeight: '600', color: c.text },
    subtitle: { fontSize: fontSize.md, color: c.textMuted, marginTop: spacing.sm },
  });
}
