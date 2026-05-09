import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { useNotesStore } from '../stores/notesStore';

export default function SyncStatus() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const syncStatus = useNotesStore((s) => s.syncStatus);

  return (
    <View style={styles.container}>
      {syncStatus === 'synced' && (
        <View style={styles.indicator}>
          <Text style={[styles.icon, { color: '#34C759' }]}>&#10003;</Text>
        </View>
      )}
      {syncStatus === 'syncing' && (
        <View style={styles.indicator}>
          <ActivityIndicator size="small" color="#FF9500" />
        </View>
      )}
      {syncStatus === 'pending' && (
        <View style={styles.indicator}>
          <Text style={[styles.icon, { color: colors.textMuted }]}>&#9679;</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    indicator: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      fontSize: fontSize.lg,
      fontWeight: '600',
    },
  });
}
