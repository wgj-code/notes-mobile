import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';

export default function SettingsScreen() {
  const { session, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.value}>{session?.user?.email ?? '—'}</Text>
      </View>
      <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
        <Text style={styles.dangerText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  section: { marginBottom: spacing.xl },
  label: { fontSize: fontSize.sm, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.xs },
  value: { fontSize: fontSize.lg, color: colors.text, fontWeight: '500' },
  dangerButton: {
    borderWidth: 1, borderColor: colors.danger, borderRadius: borderRadius.sm,
    padding: spacing.lg, alignItems: 'center',
  },
  dangerText: { color: colors.danger, fontSize: fontSize.lg, fontWeight: '600' },
});
