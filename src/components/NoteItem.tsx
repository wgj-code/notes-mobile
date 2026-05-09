import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Note } from '../types';
import { spacing, fontSize } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';

interface Props {
  note: Note;
  onPress: (note: Note) => void;
  onLongPress?: (note: Note) => void;
}

export default function NoteItem({ note, onPress, onLongPress }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

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

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.border },
    title: { fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.xs, color: c.text },
    preview: { fontSize: fontSize.md, color: c.textSecondary, lineHeight: 20 },
    date: { fontSize: fontSize.sm, color: c.textMuted, marginTop: spacing.sm },
  });
}
