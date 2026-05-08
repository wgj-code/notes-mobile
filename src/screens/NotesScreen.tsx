import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { useNotesStore } from '../stores/notesStore';
import NoteItem from '../components/NoteItem';
import EmptyState from '../components/EmptyState';
import SearchBar from '../components/SearchBar';
import FolderTree from '../components/FolderTree';
import TagFilter from '../components/TagFilter';
import SyncStatus from '../components/SyncStatus';
import type { Note } from '../types';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';
import { t } from '../i18n';

export default function NotesScreen({ navigation }: any) {
  const {
    notes,
    loading,
    error,
    fetchNotes,
    fetchFolders,
    deleteNote,
    filteredNotes,
    syncLocalToRemote,
    isOnline,
    setOnline,
  } = useNotesStore();

  const [showFolders, setShowFolders] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, []);

  // Periodic sync when online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      syncLocalToRemote();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const onRefresh = useCallback(() => {
    if (isOnline) {
      syncLocalToRemote();
    } else {
      fetchNotes();
    }
  }, [isOnline]);

  const handlePress = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id, note });
  };

  const handleLongPress = (note: Note) => {
    Alert.alert(t('notes.deleteNote'), t('notes.confirmDelete', { title: note.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(note.id);
          } catch {
            Alert.alert(t('common.error'), t('notes.failedToDelete'));
          }
        },
      },
    ]);
  };

  const handleCreate = () => {
    navigation.navigate('NoteDetail', { noteId: null });
  };

  // Get notes filtered by tag
  const displayedNotes = selectedTag
    ? filteredNotes().filter(
        (n) => n.tags && n.tags.includes(selectedTag)
      )
    : filteredNotes();

  return (
    <View style={styles.container}>
      {/* Error banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchNotes}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Search bar */}
      <SearchBar />

      {/* Sync status + folder toggle */}
      <View style={styles.toolbarRow}>
        <TouchableOpacity
          style={styles.folderToggle}
          onPress={() => setShowFolders(!showFolders)}
        >
          <Text style={styles.folderToggleText}>
            {showFolders ? t('folder.hideFolders') : t('folder.showFolders')}
          </Text>
        </TouchableOpacity>
        <SyncStatus />
      </View>

      {/* Folder tree (collapsible) */}
      {showFolders && (
        <FolderTree onFolderSelect={() => {}} />
      )}

      {/* Tag filter */}
      <TagFilter selectedTag={selectedTag} onTagSelect={setSelectedTag} />

      {/* Notes list */}
      <FlatList
        data={displayedNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteItem note={item} onPress={handlePress} onLongPress={handleLongPress} />
        )}
        contentContainerStyle={displayedNotes.length === 0 && !loading ? styles.emptyContainer : undefined}
        ListEmptyComponent={!loading && !error ? <EmptyState /> : null}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      />

      {/* FAB */}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF3F0',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#FFDDD6',
  },
  errorText: { flex: 1, color: colors.danger, fontSize: fontSize.md },
  retryText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  folderToggle: {
    paddingVertical: spacing.xs,
  },
  folderToggleText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
