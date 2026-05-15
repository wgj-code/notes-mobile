import React, { useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNotesStore } from '../stores/notesStore';
import { spacing, fontSize, borderRadius } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';
import type { Note } from '../types';

export default function RecycleBinScreen({ navigation }: any) {
  const colors = useThemeColors();
  const {
    deletedNotes,
    fetchDeletedNotes,
    restoreNote,
    permanentDeleteNote,
  } = useNotesStore();

  useEffect(() => {
    fetchDeletedNotes();
  }, []);

  const handleRestore = (note: Note) => {
    Alert.alert(t('notes.restoreNote'), `${note.title}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('notes.restoreNote'),
        onPress: async () => {
          try {
            await restoreNote(note.id);
            Alert.alert('', t('notes.noteRestored'));
          } catch {
            Alert.alert(t('common.error'), t('notes.restoreFailed'));
          }
        },
      },
    ]);
  };

  const handlePermanentDelete = (note: Note) => {
    Alert.alert(t('notes.permanentDelete'), t('notes.confirmPermanentDelete', { title: note.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await permanentDeleteNote(note.id);
            Alert.alert('', t('notes.notePermanentlyDeleted'));
          } catch {
            Alert.alert(t('common.error'), t('notes.deleteFailedPermanent'));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Note }) => (
    <View style={styles.item}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemDate} numberOfLines={1}>
          {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString() : ''}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
          onPress={() => handleRestore(item)}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {t('notes.restoreNote')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.danger + '20' }]}
          onPress={() => handlePermanentDelete(item)}
        >
          <Text style={[styles.actionText, { color: colors.danger }]}>
            {t('notes.permanentDelete')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {deletedNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}> </Text>
          <Text style={styles.emptyTitle}>{t('notes.noDeletedNotes')}</Text>
          <Text style={styles.emptyText}>{t('notes.recycleBinContent')}</Text>
        </View>
      ) : (
        <FlatList
          data={deletedNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    list: { padding: spacing.lg },
    item: {
      backgroundColor: c.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    itemInfo: { marginBottom: spacing.md },
    itemTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: c.text,
      marginBottom: spacing.xs,
    },
    itemDate: {
      fontSize: fontSize.sm,
      color: c.textMuted,
    },
    itemActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.sm,
    },
    actionText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: fontSize.xl,
      fontWeight: '600',
      color: c.text,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: fontSize.md,
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
}
