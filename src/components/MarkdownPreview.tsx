import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, spacing, fontSize } from '../lib/theme';

interface Props {
  content: string;
}

const markdownStyles = {
  body: {
    fontSize: fontSize.lg,
    lineHeight: 26,
    color: colors.text,
  },
  heading1: {
    fontSize: fontSize.xxl,
    fontWeight: '700' as const,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  heading2: {
    fontSize: fontSize.xl,
    fontWeight: '600' as const,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  heading3: {
    fontSize: fontSize.lg,
    fontWeight: '600' as const,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  paragraph: {
    marginBottom: spacing.md,
  },
  link: {
    color: colors.primary,
  },
  code_block: {
    backgroundColor: colors.border,
    padding: spacing.md,
    borderRadius: 8,
    fontFamily: 'monospace' as const,
    fontSize: fontSize.md,
  },
  fence: {
    backgroundColor: colors.border,
    padding: spacing.md,
    borderRadius: 8,
    fontFamily: 'monospace' as const,
    fontSize: fontSize.md,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
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
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.lg,
  },
};

export default function MarkdownPreview({ content }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Markdown style={markdownStyles}>{content}</Markdown>
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
