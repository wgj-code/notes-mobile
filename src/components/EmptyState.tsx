import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../lib/theme';
import { t } from '../i18n';

export default function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📝</Text>
      <Text style={styles.title}>{t('notes.noNotesYet')}</Text>
      <Text style={styles.subtitle}>{t('notes.tapToCreate')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  icon: { fontSize: 48, marginBottom: spacing.xl },
  title: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.sm },
});
