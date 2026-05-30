import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';
import { useNotesStore } from '../stores/notesStore';

export default function SearchBar() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
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
        testID="search-input"
        style={styles.input}
        placeholder={t('search.placeholder')}
        placeholderTextColor={colors.textMuted}
        value={localQuery}
        onChangeText={handleChange}
        autoCorrect={false}
        returnKeyType="search"
      />
      {localQuery.length > 0 && (
        <TouchableOpacity testID="search-clear" onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearText}>x</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.border,
      borderRadius: 8,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    input: {
      flex: 1,
      height: 40,
      fontSize: fontSize.md,
      color: c.text,
    },
    clearButton: {
      padding: spacing.xs,
    },
    clearText: {
      fontSize: fontSize.lg,
      color: c.textMuted,
      fontWeight: '600',
    },
  });
}
