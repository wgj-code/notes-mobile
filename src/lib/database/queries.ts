import { getDatabase } from './schema';
import type { Note, Folder } from '../../types';

// ── Notes ──────────────────────────────────────────────────────────────

export async function upsertLocalNote(note: Note & { is_dirty?: number }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_notes (id, user_id, title, content, folder_id, tags, created_at, updated_at, deleted_at, shared, is_dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.user_id,
      note.title,
      note.content,
      note.folder_id ?? null,
      JSON.stringify(note.tags ?? []),
      note.created_at,
      note.updated_at,
      note.deleted_at ?? null,
      note.shared ? 1 : 0,
      note.is_dirty ?? 0,
    ]
  );
}

export async function upsertLocalNotes(notes: (Note & { is_dirty?: number })[]): Promise<void> {
  const db = await getDatabase();
  const stmt = await db.prepareAsync(
    `INSERT OR REPLACE INTO local_notes (id, user_id, title, content, folder_id, tags, created_at, updated_at, deleted_at, shared, is_dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  try {
    for (const note of notes) {
      await stmt.executeAsync([
        note.id,
        note.user_id,
        note.title,
        note.content,
        note.folder_id ?? null,
        JSON.stringify(note.tags ?? []),
        note.created_at,
        note.updated_at,
        note.deleted_at ?? null,
        note.shared ? 1 : 0,
        note.is_dirty ?? 0,
      ]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getAllLocalNotes(userId: string): Promise<Note[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_notes WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`,
    [userId]
  );
  return rows.map(mapRowToNote);
}

export async function getAllLocalDeletedNotes(userId: string): Promise<Note[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_notes WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
    [userId]
  );
  return rows.map(mapRowToNote);
}

export async function getDirtyNotes(userId: string): Promise<Note[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_notes WHERE user_id = ? AND is_dirty = 1`,
    [userId]
  );
  return rows.map(mapRowToNote);
}

export async function markNoteSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE local_notes SET is_dirty = 0 WHERE id = ?`, [id]);
}

export async function markNoteDirty(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE local_notes SET is_dirty = 1 WHERE id = ?`, [id]);
}

export async function deleteLocalNote(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM local_notes WHERE id = ?`, [id]);
}

// ── Folders ────────────────────────────────────────────────────────────

export async function upsertLocalFolder(folder: Folder & { is_dirty?: number; is_deleted?: number }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_folders (id, user_id, name, parent_id, created_at, updated_at, is_dirty, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      folder.id,
      folder.user_id,
      folder.name,
      folder.parent_id ?? null,
      folder.created_at,
      folder.updated_at,
      folder.is_dirty ?? 0,
      folder.is_deleted ?? 0,
    ]
  );
}

export async function upsertLocalFolders(folders: (Folder & { is_dirty?: number; is_deleted?: number })[]): Promise<void> {
  const db = await getDatabase();
  const stmt = await db.prepareAsync(
    `INSERT OR REPLACE INTO local_folders (id, user_id, name, parent_id, created_at, updated_at, is_dirty, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  try {
    for (const f of folders) {
      await stmt.executeAsync([
        f.id,
        f.user_id,
        f.name,
        f.parent_id ?? null,
        f.created_at,
        f.updated_at,
        f.is_dirty ?? 0,
        f.is_deleted ?? 0,
      ]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function getAllLocalFolders(userId: string): Promise<Folder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_folders WHERE user_id = ? AND is_deleted = 0 ORDER BY name ASC`,
    [userId]
  );
  return rows.map(mapRowToFolder);
}

export async function getDirtyFolders(userId: string): Promise<Folder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM local_folders WHERE user_id = ? AND is_dirty = 1`,
    [userId]
  );
  return rows.map(mapRowToFolder);
}

export async function markFolderSynced(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE local_folders SET is_dirty = 0 WHERE id = ?`, [id]);
}

export async function markFolderDirty(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE local_folders SET is_dirty = 1 WHERE id = ?`, [id]);
}

export async function deleteLocalFolder(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM local_folders WHERE id = ?`, [id]);
}

// ── Helpers ────────────────────────────────────────────────────────────

function mapRowToNote(row: any): Note {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    folder_id: row.folder_id ?? null,
    tags: row.tags ? JSON.parse(row.tags) : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
    shared: row.shared === 1,
  };
}

function mapRowToFolder(row: any): Folder {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    parent_id: row.parent_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
