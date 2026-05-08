import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useNotesStore } from '../stores/notesStore';
import { mapSupabaseError, getUserMessage } from '../lib/supabase-helpers';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownPreview from '../components/MarkdownPreview';
import ImageUpload from '../components/ImageUpload';
import { colors, spacing, fontSize } from '../lib/theme';
import { t } from '../i18n';

type ViewMode = 'edit' | 'preview';

export default function NoteDetailScreen({ route, navigation }: any) {
  const { noteId, note: existingNote } = route.params ?? {};
  const isEditing = !!noteId;

  const [title, setTitle] = useState(existingNote?.title ?? '');
  const [content, setContent] = useState(existingNote?.content ?? '');
  const [folderId, setFolderId] = useState<string | null>(existingNote?.folder_id ?? null);
  const [tags, setTags] = useState<string[]>(existingNote?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const { createNote, updateNote, deleteNote, folders, fetchFolders } = useNotesStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? t('notes.editNote') : t('notes.newNote'),
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}>
            <Text style={{ color: colors.primary, fontSize: fontSize.md }}>
              {viewMode === 'edit' ? t('notes.preview') : t('notes.edit')}
            </Text>
          </TouchableOpacity>
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
  }, [navigation, isEditing, saving, viewMode, title, content]);

  const handleDelete = () => {
    Alert.alert(t('notes.deleteNote'), t('notes.cannotBeUndone'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
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
        await updateNote(noteId, trimmedTitle, content, folderId, tags);
      } else {
        await createNote(trimmedTitle, content, folderId, tags);
      }
      navigation.goBack();
    } catch (error: any) {
      const code = mapSupabaseError(error);
      Alert.alert(t('notes.saveFailed'), getUserMessage(code));
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleImageUploaded = (url: string) => {
    const imageMarkdown = `\n![image](${url})\n`;
    setContent(content + imageMarkdown);
  };

  const selectedFolder = folders.find((f) => f.id === folderId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Title input */}
      <TextInput
        style={styles.titleInput}
        placeholder={t('notes.title')}
        value={title}
        onChangeText={setTitle}
        maxLength={200}
      />

      {/* Folder selector */}
      <TouchableOpacity
        style={styles.folderSelector}
        onPress={() => {
          fetchFolders();
          setShowFolderPicker(true);
        }}
      >
        <Text style={styles.folderSelectorText}>
          {selectedFolder ? selectedFolder.name : t('notes.selectFolder')}
        </Text>
      </TouchableOpacity>

      {/* Tags */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={styles.tagChip}
            onPress={() => handleRemoveTag(tag)}
          >
            <Text style={styles.tagChipText}>#{tag} x</Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.tagInput}
          placeholder={t('notes.addTag')}
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
        />
      </ScrollView>

      {/* Image upload */}
      <View style={styles.imageUploadRow}>
        <ImageUpload onImageUploaded={handleImageUploaded} />
      </View>

      {/* Content area: edit or preview */}
      {viewMode === 'edit' ? (
        <MarkdownEditor
          value={content}
          onChangeText={setContent}
          placeholder={t('notes.startWriting')}
        />
      ) : (
        <MarkdownPreview content={content} />
      )}

      {/* Folder picker modal */}
      <Modal visible={showFolderPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowFolderPicker(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('notes.selectFolder')}</Text>

            <TouchableOpacity
              style={styles.folderOption}
              onPress={() => {
                setFolderId(null);
                setShowFolderPicker(false);
              }}
            >
              <Text style={[styles.folderOptionText, folderId === null && styles.folderOptionActive]}>
                {t('folder.none')}
              </Text>
            </TouchableOpacity>

            <ScrollView style={styles.folderList}>
              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  style={styles.folderOption}
                  onPress={() => {
                    setFolderId(folder.id);
                    setShowFolderPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.folderOptionText,
                      folderId === folder.id && styles.folderOptionActive,
                    ]}
                  >
                    {folder.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  titleInput: {
    fontSize: fontSize.xxl,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  folderSelector: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  folderSelectorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  tagsContainer: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: '#F0F5FF',
    marginRight: spacing.sm,
  },
  tagChipText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  tagInput: {
    minWidth: 80,
    fontSize: fontSize.sm,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  imageUploadRow: {
    marginBottom: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.xl,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  folderList: {
    maxHeight: 300,
  },
  folderOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  folderOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  folderOptionActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
