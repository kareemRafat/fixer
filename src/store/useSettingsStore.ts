import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDb } from "@/lib/db";

interface SettingsState {
  backupPath: string;
  autoDetectServices: boolean;
  compressBackups: boolean;
  mysqlDataPath: string;
  // Database connection settings
  host: string;
  port: number;
  user: string;
  password: string;
  
  setBackupPath: (path: string) => void;
  setAutoDetectServices: (enabled: boolean) => void;
  setCompressBackups: (enabled: boolean) => void;
  setMysqlDataPath: (path: string) => void;
  setHost: (host: string) => void;
  setPort: (port: number) => void;
  setUser: (user: string) => void;
  setPassword: (password: string) => void;
  syncToDb: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      backupPath: "",
      autoDetectServices: true,
      compressBackups: false,
      mysqlDataPath: "C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Data",
      host: "localhost",
      port: 3306,
      user: "root",
      password: "",

      setBackupPath: (path) => { set({ backupPath: path }); get().syncToDb(); },
      setAutoDetectServices: (enabled) => set({ autoDetectServices: enabled }),
      setCompressBackups: (enabled) => { set({ compressBackups: enabled }); get().syncToDb(); },
      setMysqlDataPath: (path) => set({ mysqlDataPath: path }),
      setHost: (host) => { set({ host }); get().syncToDb(); },
      setPort: (port) => { set({ port: Number(port) }); get().syncToDb(); },
      setUser: (user) => { set({ user }); get().syncToDb(); },
      setPassword: (password) => { set({ password }); get().syncToDb(); },
      
      syncToDb: async () => {
        const state = get();
        const db = await getDb();
        await db.execute("UPDATE settings SET value = $1 WHERE key = 'host'", [state.host]);
        await db.execute("UPDATE settings SET value = $1 WHERE key = 'port'", [state.port.toString()]);
        await db.execute("UPDATE settings SET value = $1 WHERE key = 'user'", [state.user]);
        await db.execute("UPDATE settings SET value = $1 WHERE key = 'password'", [state.password]);
        await db.execute("UPDATE settings SET value = $1 WHERE key = 'backup_path'", [state.backupPath]);
        await db.execute("UPDATE settings SET value = $1 WHERE key = 'compress_backups'", [state.compressBackups.toString()]);
      }
    }),
    {
      name: "backup-manager-settings",
    }
  )
);
