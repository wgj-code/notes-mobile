import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { spacing, fontSize } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import {
  processWikiLinks,
  isNoteLink,
  extractNoteTitleFromLink,
  findNoteIdByTitle,
} from '../lib/markdown/linkParser';

interface Props {
  content: string;
  /** Called when a [[wiki-link]] is tapped with the target note ID. */
  onNavigateToNote?: (noteId: string) => void;
}

function buildMarkdownStyles(c: ReturnType<typeof useThemeColors>) {
  return {
    body: {
      fontSize: fontSize.lg,
      lineHeight: 26,
      color: c.text,
    },
    heading1: {
      fontSize: fontSize.xxl,
      fontWeight: '700' as const,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
      color: c.text,
    },
    heading2: {
      fontSize: fontSize.xl,
      fontWeight: '600' as const,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      color: c.text,
    },
    heading3: {
      fontSize: fontSize.lg,
      fontWeight: '600' as const,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      color: c.text,
    },
    paragraph: {
      marginBottom: spacing.md,
    },
    link: {
      color: c.primary,
    },
    code_inline: {
      backgroundColor: c.border,
      color: c.text,
      paddingHorizontal: 4,
      borderRadius: 4,
      fontFamily: 'monospace' as const,
      fontSize: fontSize.md,
    },
    code_block: {
      backgroundColor: c.border,
      padding: spacing.md,
      borderRadius: 8,
      fontFamily: 'monospace' as const,
      fontSize: fontSize.md,
      color: c.text,
    },
    fence: {
      backgroundColor: c.border,
      padding: spacing.md,
      borderRadius: 8,
      fontFamily: 'monospace' as const,
      fontSize: fontSize.md,
      color: c.text,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
      paddingLeft: spacing.md,
      marginLeft: 0,
      marginVertical: spacing.sm,
      fontStyle: 'italic' as const,
    },
    list_item: {
      marginBottom: spacing.xs,
    },
    bullet_list: {
      marginBottom: spacing.md,
    },
    ordered_list: {
      marginBottom: spacing.md,
    },
    hr: {
      backgroundColor: c.border,
      height: 1,
      marginVertical: spacing.lg,
    },
  };
}

export default function MarkdownPreview({ content, onNavigateToNote }: Props) {
  const colors = useThemeColors();
  const markdownStyles = buildMarkdownStyles(colors);

  const handleLinkPress = useCallback(
    (url: string) => {
      if (!onNavigateToNote) return false;

      if (isNoteLink(url)) {
        const title = extractNoteTitleFromLink(url);
        if (title) {
          const noteId = findNoteIdByTitle(title);
          if (noteId) {
            onNavigateToNote(noteId);
            return true;
          }
        }
        // Note not found - let the press pass through (no-op)
        return true;
      }

      // External link - let default behavior handle it
      return false;
    },
    [onNavigateToNote]
  );

  const processedContent = processWikiLinks(content);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Markdown
        style={markdownStyles}
        onLinkPress={onNavigateToNote ? handleLinkPress : undefined}
      >
        {processedContent}
      </Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
});
