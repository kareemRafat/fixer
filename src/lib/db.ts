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
        file_path TEXT NOT NULL,
        trigger_type TEXT DEFAULT 'manual' -- "manual" or "scheduled"
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Initialize default settings if not exists
    const existingSettings = await db.select<any[]>("SELECT * FROM settings");
    if (existingSettings.length === 0) {
      await db.execute("INSERT INTO settings (key, value) VALUES ('host', 'localhost')");
      await db.execute("INSERT INTO settings (key, value) VALUES ('port', '3306')");
      await db.execute("INSERT INTO settings (key, value) VALUES ('user', 'root')");
      await db.execute("INSERT INTO settings (key, value) VALUES ('password', '')");
      await db.execute("INSERT INTO settings (key, value) VALUES ('backup_path', '')");
      await db.execute("INSERT INTO settings (key, value) VALUES ('compress_backups', 'false')");
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        databases TEXT NOT NULL,
        frequency TEXT NOT NULL, -- "daily", "weekly", "monthly"
        time TEXT NOT NULL, -- HH:mm
        day_of_week INTEGER, -- 0-6 (0=Sunday)
        day_of_month INTEGER, -- 1-31
        backup_type TEXT DEFAULT 'sql',
        is_active INTEGER DEFAULT 1,
        last_run TEXT
      )
    `);

    // Migrations
    try {
      await db.execute("ALTER TABLE backups ADD COLUMN databases TEXT");
    } catch (e) {}
    try {
      await db.execute("ALTER TABLE backups ADD COLUMN backup_type TEXT");
    } catch (e) {}
    try {
      await db.execute("ALTER TABLE backups ADD COLUMN trigger_type TEXT DEFAULT 'manual'");
    } catch (e) {}
    try {
      await db.execute("ALTER TABLE schedules ADD COLUMN backup_type TEXT DEFAULT 'sql'");
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
  trigger_type: "manual" | "scheduled";
}

export interface Schedule {
  id: number;
  name: string;
  databases: string;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  day_of_week?: number;
  day_of_month?: number;
  backup_type: "sql" | "raw";
  is_active: boolean;
  last_run?: string;
}

export const addBackup = async (backup: Omit<BackupRecord, "id">) => {
  const database = await getDb();
  await database.execute(
    "INSERT INTO backups (database_name, databases, backup_type, timestamp, file_size, status, file_path, trigger_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      backup.database_name, 
      backup.databases || null, 
      backup.backup_type || "sql",
      backup.timestamp, 
      backup.file_size, 
      backup.status, 
      backup.file_path,
      backup.trigger_type || "manual"
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

// Schedule Functions
export const addSchedule = async (schedule: Omit<Schedule, "id">) => {
  const database = await getDb();
  await database.execute(
    `INSERT INTO schedules (name, databases, frequency, time, day_of_week, day_of_month, backup_type, is_active) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      schedule.name,
      schedule.databases,
      schedule.frequency,
      schedule.time,
      schedule.day_of_week ?? null,
      schedule.day_of_month ?? null,
      schedule.backup_type,
      schedule.is_active ? 1 : 0
    ]
  );
};

export const getSchedules = async (): Promise<Schedule[]> => {
  const database = await getDb();
  const rawSchedules = await database.select<any[]>("SELECT * FROM schedules");
  return rawSchedules.map(s => ({
    ...s,
    is_active: s.is_active === 1
  }));
};

export const updateSchedule = async (schedule: Schedule) => {
  const database = await getDb();
  await database.execute(
    `UPDATE schedules SET 
      name = $1, 
      databases = $2, 
      frequency = $3, 
      time = $4, 
      day_of_week = $5, 
      day_of_month = $6, 
      backup_type = $7,
      is_active = $8
     WHERE id = $9`,
    [
      schedule.name,
      schedule.databases,
      schedule.frequency,
      schedule.time,
      schedule.day_of_week ?? null,
      schedule.day_of_month ?? null,
      schedule.backup_type,
      schedule.is_active ? 1 : 0,
      schedule.id
    ]
  );
};

export const deleteSchedule = async (id: number) => {
  const database = await getDb();
  await database.execute("DELETE FROM schedules WHERE id = $1", [id]);
};

export const updateScheduleLastRun = async (id: number, lastRun: string) => {
  const database = await getDb();
  await database.execute("UPDATE schedules SET last_run = $1 WHERE id = $2", [lastRun, id]);
};
