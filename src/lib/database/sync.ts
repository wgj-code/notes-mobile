import { supabase } from '../supabase';
import {
  getDirtyNotes,
  markNoteSynced,
  upsertLocalNotes,
  getDirtyFolders,
  markFolderSynced,
  upsertLocalFolders,
} from './queries';
import type { Note, Folder } from '../../types';

export type SyncResult = {
  pushed: number;
  pulled: number;
};

/**
 * Push local dirty records to Supabase and pull remote changes.
 * Called from the sync action in notesStore.
 */
export async function syncNotes(userId: string): Promise<SyncResult> {
  let pushed = 0;
  let pulled = 0;

  // ── Push dirty notes ────────────────────────────────────────────────
  const dirtyNotes = await getDirtyNotes(userId);
  for (const note of dirtyNotes) {
    try {
      const { error } = await supabase
        .from('notes')
        .upsert(
          {
            id: note.id,
            user_id: note.user_id,
            title: note.title,
            content: note.content,
            folder_id: note.folder_id,
            tags: note.tags,
            created_at: note.created_at,
            updated_at: note.updated_at,
            deleted_at: note.deleted_at,
          },
          { onConflict: 'id' }
        );
      if (!error) {
        await markNoteSynced(note.id);
        pushed++;
      }
    } catch {
      // Skip failed pushes, will retry on next sync
    }
  }

  // ── Push dirty folders ──────────────────────────────────────────────
  const dirtyFolders = await getDirtyFolders(userId);
  for (const folder of dirtyFolders) {
    try {
      const { error } = await supabase
        .from('folders')
        .upsert(
          {
            id: folder.id,
            user_id: folder.user_id,
            name: folder.name,
            parent_id: folder.parent_id,
            created_at: folder.created_at,
            updated_at: folder.updated_at,
          },
          { onConflict: 'id' }
        );
      if (!error) {
        await markFolderSynced(folder.id);
        pushed++;
      }
    } catch {
      // Skip failed pushes
    }
  }

  // ── Pull remote notes ───────────────────────────────────────────────
  try {
    const { data: remoteNotes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (!notesError && remoteNotes) {
      await upsertLocalNotes(
        (remoteNotes as Note[]).map((n) => ({ ...n, is_dirty: 0 }))
      );
      pulled = remoteNotes.length;
    }
  } catch {
    // Pull failed, will retry next time
  }

  // ── Pull remote folders ─────────────────────────────────────────────
  try {
    const { data: remoteFolders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .order('name', { ascending: true });

    if (!foldersError && remoteFolders) {
      await upsertLocalFolders(
        (remoteFolders as Folder[]).map((f) => ({ ...f, is_dirty: 0 }))
      );
    }
  } catch {
    // Pull failed
  }

  return { pushed, pulled };
}
