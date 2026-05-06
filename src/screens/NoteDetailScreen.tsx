import React, { useState, useLayoutEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNotesStore } from '../stores/notesStore';
import { mapSupabaseError, getUserMessage } from '../lib/supabase-helpers';
import { colors, spacing, fontSize } from '../lib/theme';

export default function NoteDetailScreen({ route, navigation }: any) {
  const { noteId, note: existingNote } = route.params ?? {};
  const isEditing = !!noteId;

  const [title, setTitle] = useState(existingNote?.title ?? '');
  const [content, setContent] = useState(existingNote?.content ?? '');
  const [saving, setSaving] = useState(false);
  const { createNote, updateNote, deleteNote } = useNotesStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Note' : 'New Note',
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={save} disabled={saving}>
            <Text style={{ color: saving ? colors.border : colors.primary, fontSize: fontSize.md }}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity onPress={handleDelete}>
              <Text style={{ color: colors.danger, fontSize: fontSize.md }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, isEditing, saving, title, content]);

  const handleDelete = () => {
    Alert.alert('Delete Note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteNote(noteId);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete note');
          }
        },
      },
    ]);
  };

  const save = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Error', 'Title cannot be empty');
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
      Alert.alert('Save Failed', getUserMessage(code));
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
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        maxLength={200}
      />
      <TextInput
        style={styles.contentInput}
        placeholder="Start writing..."
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
