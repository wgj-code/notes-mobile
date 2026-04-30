import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Note } from '../types';
import { colors, spacing, fontSize } from '../lib/theme';

interface Props {
  note: Note;
  onPress: (note: Note) => void;
  onLongPress?: (note: Note) => void;
}

export default function NoteItem({ note, onPress, onLongPress }: Props) {
  return (
    <TouchableOpacity
      onPress={() => onPress(note)}
      onLongPress={() => onLongPress?.(note)}
      style={styles.container}
    >
      <Text style={styles.title} numberOfLines={1}>{note.title}</Text>
      <Text style={styles.preview} numberOfLines={2}>{note.content}</Text>
      <Text style={styles.date}>{new Date(note.updated_at).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.xs },
  preview: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 20 },
  date: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },
});
