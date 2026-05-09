import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { useNotesStore } from '../stores/notesStore';

interface Props {
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

export default function TagFilter({ selectedTag, onTagSelect }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const notes = useNotesStore((s) => s.notes);

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const note of notes) {
      if (note.tags && Array.isArray(note.tags)) {
        for (const tag of note.tags) {
          if (tag.trim()) tagSet.add(tag.trim());
        }
      }
    }
    return Array.from(tagSet).sort();
  }, [notes]);

  if (uniqueTags.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={[styles.chip, !selectedTag && styles.chipActive]}
        onPress={() => onTagSelect(null)}
      >
        <Text style={[styles.chipText, !selectedTag && styles.chipTextActive]}>
          All
        </Text>
      </TouchableOpacity>
      {uniqueTags.map((tag) => (
        <TouchableOpacity
          key={tag}
          style={[styles.chip, selectedTag === tag && styles.chipActive]}
          onPress={() => onTagSelect(selectedTag === tag ? null : tag)}
        >
          <Text style={[styles.chipText, selectedTag === tag && styles.chipTextActive]}>
            #{tag}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flexGrow: 0,
      maxHeight: 50,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      backgroundColor: c.border,
      marginRight: spacing.sm,
    },
    chipActive: {
      backgroundColor: c.primary,
    },
    chipText: {
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
  });
}
