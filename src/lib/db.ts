import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export const getDb = async () => {
  if (!db) {
    db = await Database.load("sqlite:backups.db");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        database_name TEXT NOT NULL,
        databases TEXT,
        backup_type TEXT, -- "sql" or "raw"
        timestamp TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        status TEXT NOT NULL,
        file_path TEXT NOT NULL
      )
    `);

    // Migrations
    try {
      await db.execute("ALTER TABLE backups ADD COLUMN databases TEXT");
    } catch (e) {}
    try {
      await db.execute("ALTER TABLE backups ADD COLUMN backup_type TEXT");
    } catch (e) {}
  }
  return db;
};

export interface BackupRecord {
  id: number;
  database_name: string;
  databases?: string;
  backup_type?: "sql" | "raw";
  timestamp: string;
  file_size: number;
  status: string;
  file_path: string;
}

export const addBackup = async (backup: Omit<BackupRecord, "id">) => {
  const database = await getDb();
  await database.execute(
    "INSERT INTO backups (database_name, databases, backup_type, timestamp, file_size, status, file_path) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      backup.database_name, 
      backup.databases || null, 
      backup.backup_type || "sql",
      backup.timestamp, 
      backup.file_size, 
      backup.status, 
      backup.file_path
    ]
  );
};

export const getBackups = async (): Promise<BackupRecord[]> => {
  const database = await getDb();
  return await database.select<BackupRecord[]>("SELECT * FROM backups ORDER BY id DESC");
};

export const deleteBackupRecord = async (id: number) => {
  const database = await getDb();
  await database.execute("DELETE FROM backups WHERE id = $1", [id]);
};
