import React, { useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useNotesStore } from '../stores/notesStore';
import NoteItem from '../components/NoteItem';
import EmptyState from '../components/EmptyState';
import type { Note } from '../types';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';
import { t } from '../i18n';

export default function NotesScreen({ navigation }: any) {
  const { notes, loading, error, fetchNotes, deleteNote } = useNotesStore();

  useEffect(() => {
    fetchNotes();
  }, []);

  const onRefresh = useCallback(() => {
    fetchNotes();
  }, []);

  const handlePress = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id, note });
  };

  const handleLongPress = (note: Note) => {
    Alert.alert(t('notes.deleteNote'), t('notes.confirmDelete', { title: note.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          try { await deleteNote(note.id); }
          catch { Alert.alert(t('common.error'), t('notes.failedToDelete')); }
        },
      },
    ]);
  };

  const handleCreate = () => {
    navigation.navigate('NoteDetail', { noteId: null });
  };

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchNotes}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteItem note={item} onPress={handlePress} onLongPress={handleLongPress} />
        )}
        contentContainerStyle={notes.length === 0 && !loading ? styles.emptyContainer : undefined}
        ListEmptyComponent={!loading && !error ? <EmptyState /> : null}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      />
      <TouchableOpacity style={styles.fab} onPress={handleCreate}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyContainer: { flex: 1 },
  errorBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF3F0', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: '#FFDDD6',
  },
  errorText: { flex: 1, color: colors.danger, fontSize: fontSize.md },
  retryText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600', marginLeft: spacing.md },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: borderRadius.lg,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
