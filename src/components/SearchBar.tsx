import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../lib/theme';
import { t } from '../i18n';
import { useNotesStore } from '../stores/notesStore';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useNotesStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleChange = (text: string) => {
    setLocalQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearchQuery(text);
    }, 300);
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={t('search.placeholder')}
        placeholderTextColor={colors.textMuted}
        value={localQuery}
        onChangeText={handleChange}
        autoCorrect={false}
        returnKeyType="search"
      />
      {localQuery.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearText}>x</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border,
    borderRadius: 8,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: fontSize.md,
    color: colors.text,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
