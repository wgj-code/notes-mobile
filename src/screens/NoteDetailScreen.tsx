import React, { useState, useLayoutEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNotesStore } from '../stores/notesStore';
import { mapSupabaseError, getUserMessage } from '../lib/supabase-helpers';
import { colors, spacing, fontSize } from '../lib/theme';
import { t } from '../i18n';

export default function NoteDetailScreen({ route, navigation }: any) {
  const { noteId, note: existingNote } = route.params ?? {};
  const isEditing = !!noteId;

  const [title, setTitle] = useState(existingNote?.title ?? '');
  const [content, setContent] = useState(existingNote?.content ?? '');
  const [saving, setSaving] = useState(false);
  const { createNote, updateNote, deleteNote } = useNotesStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('notes.editNote') : t('notes.newNote'),
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={save} disabled={saving}>
            <Text style={{ color: saving ? colors.border : colors.primary, fontSize: fontSize.md }}>
              {saving ? t('notes.saving') : t('common.save')}
            </Text>
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity onPress={handleDelete}>
              <Text style={{ color: colors.danger, fontSize: fontSize.md }}>{t('common.delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, isEditing, saving, title, content]);

  const handleDelete = () => {
    Alert.alert(t('notes.deleteNote'), t('notes.cannotBeUndone'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          try {
            await deleteNote(noteId);
            navigation.goBack();
          } catch {
            Alert.alert(t('common.error'), t('notes.failedToDelete'));
          }
        },
      },
    ]);
  };

  const save = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert(t('common.error'), t('notes.titleEmpty'));
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        await updateNote(noteId, trimmedTitle, content);
      } else {
        await createNote(trimmedTitle, content);
      }
      navigation.goBack();
    } catch (error: any) {
      const code = mapSupabaseError(error);
      Alert.alert(t('notes.saveFailed'), getUserMessage(code));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TextInput
        style={styles.titleInput}
        placeholder={t('notes.title')}
        value={title}
        onChangeText={setTitle}
        maxLength={200}
      />
      <TextInput
        style={styles.contentInput}
        placeholder={t('notes.startWriting')}
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  titleInput: {
    fontSize: fontSize.xxl, fontWeight: '600', borderBottomWidth: 1,
    borderBottomColor: colors.border, paddingBottom: spacing.sm, marginBottom: spacing.md,
  },
  contentInput: { flex: 1, fontSize: fontSize.lg, lineHeight: 24 },
});
