import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { colors, spacing, fontSize } from '../lib/theme';
import { t } from '../i18n';
import { useNotesStore } from '../stores/notesStore';
import type { Folder } from '../types';

interface FolderNode extends Folder {
  children: FolderNode[];
  level: number;
}

function buildTree(folders: Folder[], maxLevel: number = 3): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  // Initialize all nodes
  for (const f of folders) {
    map.set(f.id, { ...f, children: [], level: 0 });
  }

  // Build tree
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      const parent = map.get(f.parent_id)!;
      node.level = parent.level + 1;
      if (node.level < maxLevel) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function flattenTree(nodes: FolderNode[]): FolderNode[] {
  const result: FolderNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

interface Props {
  onFolderSelect?: () => void;
}

export default function FolderTree({ onFolderSelect }: Props) {
  const { folders, selectedFolderId, setSelectedFolderId, createFolder, deleteFolder } = useNotesStore();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const tree = buildTree(folders);
  const flatFolders = flattenTree(tree);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createFolder(name);
      setNewFolderName('');
      setShowNewFolder(false);
    } catch {
      Alert.alert(t('common.error'), t('folder.createFailed'));
    }
  };

  const handleDeleteFolder = (folder: FolderNode) => {
    Alert.alert(t('folder.delete'), t('folder.confirmDelete', { name: folder.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFolder(folder.id);
          } catch {
            Alert.alert(t('common.error'), t('folder.deleteFailed'));
          }
        },
      },
    ]);
  };

  const handleSelectAll = () => {
    setSelectedFolderId(null);
    onFolderSelect?.();
  };

  const handleSelectUncategorized = () => {
    setSelectedFolderId('__uncategorized');
    onFolderSelect?.();
  };

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    onFolderSelect?.();
  };

  return (
    <View style={styles.container}>
      {/* Default options */}
      <TouchableOpacity
        style={[styles.item, selectedFolderId === null && styles.itemActive]}
        onPress={handleSelectAll}
      >
        <Text style={[styles.itemText, selectedFolderId === null && styles.itemTextActive]}>
          {t('folder.allNotes')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.item, selectedFolderId === '__uncategorized' && styles.itemActive]}
        onPress={handleSelectUncategorized}
      >
        <Text style={[styles.itemText, selectedFolderId === '__uncategorized' && styles.itemTextActive]}>
          {t('folder.uncategorized')}
        </Text>
      </TouchableOpacity>

      {/* Folder list */}
      {flatFolders.map((folder) => (
        <TouchableOpacity
          key={folder.id}
          style={[
            styles.item,
            styles.folderItem,
            { paddingLeft: spacing.lg + folder.level * spacing.xl },
            selectedFolderId === folder.id && styles.itemActive,
          ]}
          onPress={() => handleSelectFolder(folder.id)}
          onLongPress={() => handleDeleteFolder(folder)}
        >
          <Text
            style={[
              styles.itemText,
              selectedFolderId === folder.id && styles.itemTextActive,
            ]}
            numberOfLines={1}
          >
            {folder.name}
          </Text>
        </TouchableOpacity>
      ))}

      {/* New folder button */}
      <TouchableOpacity style={styles.newFolderButton} onPress={() => setShowNewFolder(true)}>
        <Text style={styles.newFolderText}>+ {t('folder.newFolder')}</Text>
      </TouchableOpacity>

      {/* New folder modal */}
      <Modal visible={showNewFolder} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowNewFolder(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('folder.newFolder')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('folder.folderName')}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowNewFolder(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateFolder}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  item: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemActive: {
    backgroundColor: '#F0F5FF',
  },
  itemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  itemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  newFolderButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  newFolderText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '500',
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
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.lg,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontWeight: '600',
  },
});
