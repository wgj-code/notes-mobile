import * as SQLite from 'expo-sqlite';

const DB_NAME = 'notes.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    await initTables(dbInstance);
  }
  return dbInstance;
}

async function initTables(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS local_folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_dirty INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES local_folders(id)
    );

    CREATE TABLE IF NOT EXISTS local_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      folder_id TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      is_dirty INTEGER DEFAULT 0,
      FOREIGN KEY (folder_id) REFERENCES local_folders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_local_notes_folder ON local_notes(folder_id);
    CREATE INDEX IF NOT EXISTS idx_local_notes_dirty ON local_notes(is_dirty);
    CREATE INDEX IF NOT EXISTS idx_local_notes_user ON local_notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_local_folders_user ON local_folders(user_id);
  `);
}

export async function resetDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
