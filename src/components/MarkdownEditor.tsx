import React, { useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const TOOLBAR_ITEMS = [
  { label: 'B', action: 'bold', wrap: ['**', '**'] },
  { label: 'I', action: 'italic', wrap: ['*', '*'] },
  { label: '[]', action: 'link', wrap: ['[', '](url)'] },
  { label: '[[]]', action: 'internalLink', wrap: ['[[', ']]'] },
  { label: '-', action: 'list', prefix: '- ' },
];

export default function MarkdownEditor({ value, onChangeText, placeholder }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const inputRef = useRef<TextInput>(null);

  const insertMarkdown = (item: typeof TOOLBAR_ITEMS[number]) => {
    if (!inputRef.current) return;

    // For simplicity, append to end
    let newText = value;

    if (item.wrap) {
      newText = value + item.wrap[0] + item.wrap[1];
    } else if (item.prefix) {
      newText = value + (value.length > 0 && !value.endsWith('\n') ? '\n' : '') + item.prefix;
    }

    onChangeText(newText);
  };

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        {TOOLBAR_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.action}
            style={styles.toolbarButton}
            onPress={() => insertMarkdown(item)}
          >
            <Text style={styles.toolbarButtonText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Editor */}
      <TextInput
        testID="note-content-editor"
        ref={inputRef}
        style={styles.editor}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        autoCorrect={false}
      />

      {/* Character count */}
      <View style={styles.footer}>
        <Text style={styles.charCount}>{value.length}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    toolbar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      gap: spacing.sm,
    },
    toolbarButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 4,
      backgroundColor: c.border,
    },
    toolbarButtonText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: c.text,
    },
    editor: {
      flex: 1,
      fontSize: fontSize.lg,
      lineHeight: 24,
      padding: spacing.lg,
      color: c.text,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    charCount: {
      fontSize: fontSize.sm,
      color: c.textMuted,
    },
  });
}
