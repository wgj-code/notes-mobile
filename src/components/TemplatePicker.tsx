import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTemplateStore, processTemplateContent } from '../stores/templateStore';
import type { Template } from '../types';
import { spacing, fontSize } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';

// Built-in template icon mapping
const BUILTIN_ICONS: Record<string, string> = {
  diary: '📖',    // open book
  meeting: '📞',  // telephone receiver (close to meeting)
  reading: '📚',  // books
  todo: '☑️',     // checkbox
  freeform: '✏️', // pencil
};

// Key mapping for built-in template description lookup
const BUILTIN_DESC_KEYS: Record<string, string> = {
  diary: 'templates.diaryDesc',
  meeting: 'templates.meetingDesc',
  reading: 'templates.readingDesc',
  todo: 'templates.todoDesc',
  freeform: 'templates.freeformDesc',
};

const BUILTIN_NAME_KEYS: Record<string, string> = {
  diary: 'templates.diary',
  meeting: 'templates.meeting',
  reading: 'templates.reading',
  todo: 'templates.todo',
  freeform: 'templates.freeform',
};

interface TemplatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (title: string, content: string) => void;
}

export default function TemplatePicker({ visible, onClose, onSelect }: TemplatePickerProps) {
  const colors = useThemeColors();
  const { templates, loading, fetchTemplates, deleteTemplate } = useTemplateStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchTemplates();
    }
  }, [visible]);

  const builtinTemplates = templates.filter((t) => t.is_builtin);
  const customTemplates = templates.filter((t) => !t.is_builtin);

  const handleSelect = (template: Template) => {
    const title = template.title || '';
    const content = processTemplateContent(template.content || '');
    onClose();
    onSelect(title, content);
  };

  const handleSkip = () => {
    onClose();
    onSelect('', '');
  };

  const handleDeleteCustom = async (template: Template) => {
    try {
      setDeletingId(template.id);
      await deleteTemplate(template.id);
    } catch {
      // Silently handle; the store sets error state
    } finally {
      setDeletingId(null);
    }
  };

  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('templates.title')}</Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.xl }} />
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Built-in templates */}
              {builtinTemplates.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>{t('templates.builtin')}</Text>
                  {builtinTemplates.map((tpl) => (
                    <TouchableOpacity
                      key={tpl.id}
                      style={styles.templateRow}
                      onPress={() => handleSelect(tpl)}
                    >
                      <Text style={styles.templateIcon}>
                        {BUILTIN_ICONS[tpl.id] || '📋'}
                      </Text>
                      <View style={styles.templateInfo}>
                        <Text style={styles.templateName}>
                          {BUILTIN_NAME_KEYS[tpl.id] || tpl.name}
                        </Text>
                        <Text style={styles.templateDesc}>
                          {BUILTIN_DESC_KEYS[tpl.id] ? t(BUILTIN_DESC_KEYS[tpl.id]) : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Custom templates */}
              {customTemplates.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>{t('templates.custom')}</Text>
                  {customTemplates.map((tpl) => (
                    <View key={tpl.id} style={styles.templateRow}>
                      <TouchableOpacity
                        style={styles.templateRowContent}
                        onPress={() => handleSelect(tpl)}
                      >
                        <Text style={styles.templateIcon}>{'✏️'}</Text>
                        <View style={styles.templateInfo}>
                          <Text style={styles.templateName}>{tpl.name}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteCustom(tpl)}
                        disabled={deletingId === tpl.id}
                      >
                        <Text style={styles.deleteBtnText}>
                          {deletingId === tpl.id ? '' : t('common.delete')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {/* Empty state for custom templates */}
              {!loading && customTemplates.length === 0 && (
                <Text style={styles.emptyText}>{t('templates.noCustom')}</Text>
              )}
            </ScrollView>
          )}

          {/* Skip / Start Empty button */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>{t('templates.skip')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: c.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: spacing.xl,
      maxHeight: '70%',
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: '600',
      color: c.text,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    scroll: {
      maxHeight: 400,
    },
    sectionTitle: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    templateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    templateRowContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    templateIcon: {
      fontSize: 24,
      marginRight: spacing.md,
      width: 32,
      textAlign: 'center',
    },
    templateInfo: {
      flex: 1,
    },
    templateName: {
      fontSize: fontSize.md,
      fontWeight: '500',
      color: c.text,
    },
    templateDesc: {
      fontSize: fontSize.sm,
      color: c.textSecondary,
      marginTop: 2,
    },
    deleteBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    deleteBtnText: {
      fontSize: fontSize.sm,
      color: c.danger,
    },
    emptyText: {
      fontSize: fontSize.md,
      color: c.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
    skipButton: {
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
    },
    skipButtonText: {
      fontSize: fontSize.md,
      color: c.textSecondary,
      fontWeight: '500',
    },
  });
}
