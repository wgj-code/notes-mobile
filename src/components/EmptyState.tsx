import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../lib/theme';

export default function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📝</Text>
      <Text style={styles.title}>No notes yet</Text>
      <Text style={styles.subtitle}>Tap + to create one</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  icon: { fontSize: 48, marginBottom: spacing.xl },
  title: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.sm },
});
