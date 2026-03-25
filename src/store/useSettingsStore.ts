import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDb } from "@/lib/db";
import { invoke } from "@tauri-apps/api/core";

interface SettingsState {
  backupPath: string;
  autoDetectServices: boolean;
  compressBackups: boolean;
  mysqlDataPath: string;
  host: string;
  port: number;
  user: string;
  password: string;
  primaryColor: string;
  runOnStartup: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  isInitialized: boolean;
  
  setBackupPath: (path: string) => void;
  setAutoDetectServices: (enabled: boolean) => void;
  setCompressBackups: (enabled: boolean) => void;
  setMysqlDataPath: (path: string) => void;
  setHost: (host: string) => void;
  setPort: (port: number) => void;
  setUser: (user: string) => void;
  setPassword: (password: string) => void;
  setPrimaryColor: (color: string) => void;
  setRunOnStartup: (enabled: boolean) => Promise<void>;
  setMinimizeToTray: (enabled: boolean) => Promise<void>;
  setStartMinimized: (enabled: boolean) => Promise<void>;
  initialize: () => Promise<void>;
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
      primaryColor: "188.7 94.5% 30%",
      runOnStartup: false,
      minimizeToTray: true,
      startMinimized: false,
      isInitialized: false,

      setBackupPath: (path) => { set({ backupPath: path }); get().syncToDb(); },
      setAutoDetectServices: (enabled) => set({ autoDetectServices: enabled }),
      setCompressBackups: (enabled) => { set({ compressBackups: enabled }); get().syncToDb(); },
      setMysqlDataPath: (path) => set({ mysqlDataPath: path }),
      setHost: (host) => { set({ host }); get().syncToDb(); },
      setPort: (port) => { set({ port: Number(port) }); get().syncToDb(); },
      setUser: (user) => { set({ user }); get().syncToDb(); },
      setPassword: (password) => { set({ password }); get().syncToDb(); },
      setPrimaryColor: (color) => {
        set({ primaryColor: color });
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--ring', color);
        document.documentElement.style.setProperty('--accent', color);
      },
      
      setRunOnStartup: async (enabled) => { 
        const { enable, disable } = await import("@tauri-apps/plugin-autostart");
        try {
          if (enabled) {
            if (get().startMinimized) {
              await enable(["--minimized"]);
            } else {
              await enable();
            }
          } else {
            await disable();
          }
          set({ runOnStartup: enabled }); 
          await get().syncToDb(); 
        } catch (e) {
          console.error("Failed to update autostart:", e);
        }
      },

      setMinimizeToTray: async (enabled) => { 
        set({ minimizeToTray: enabled }); 
        try {
          await invoke("update_minimize_to_tray", { enabled });
          await get().syncToDb(); 
        } catch (e) {
          console.error("Failed to update minimize to tray:", e);
        }
      },

      setStartMinimized: async (enabled) => { 
        const { enable, isEnabled } = await import("@tauri-apps/plugin-autostart");
        try {
          const alreadyEnabled = await isEnabled();
          if (alreadyEnabled) {
            if (enabled) {
              await enable(["--minimized"]);
            } else {
              await enable();
            }
          }
          set({ startMinimized: enabled }); 
          await get().syncToDb(); 
        } catch (e) {
          console.error("Failed to update start minimized:", e);
        }
      },
      
      initialize: async () => {
        if (get().isInitialized) return;

        try {
          const db = await getDb();
          const settingsFromDb = await db.select<any[]>("SELECT * FROM settings");
          const dbSettings: any = {};
          settingsFromDb.forEach(s => {
            dbSettings[s.key] = s.value;
          });

          const { isEnabled } = await import("@tauri-apps/plugin-autostart");
          const autostartEnabled = await isEnabled();

          const runOnStartup = dbSettings['run_on_startup'] === 'true';
          const minimizeToTray = dbSettings['minimize_to_tray'] === 'true';
          const startMinimized = dbSettings['start_minimized'] === 'true';
          const primaryColor = dbSettings['primary_color'] || get().primaryColor;

          // Sync backend state
          await invoke("update_minimize_to_tray", { enabled: minimizeToTray });

          // Sync CSS
          document.documentElement.style.setProperty('--primary', primaryColor);
          document.documentElement.style.setProperty('--ring', primaryColor);
          document.documentElement.style.setProperty('--accent', primaryColor);

          set({ 
            host: dbSettings['host'] || get().host,
            port: Number(dbSettings['port']) || get().port,
            user: dbSettings['user'] || get().user,
            password: dbSettings['password'] || get().password,
            backupPath: dbSettings['backup_path'] || get().backupPath,
            compressBackups: dbSettings['compress_backups'] === 'true',
            runOnStartup: autostartEnabled, // Trust the actual plugin status
            minimizeToTray,
            startMinimized,
            primaryColor,
            isInitialized: true
          });

          // If DB says we should be enabled but plugin says no, or vice versa, sync it (optional but good)
          if (runOnStartup !== autostartEnabled) {
            await get().syncToDb();
          }

        } catch (e) {
          console.error("Failed to initialize settings store:", e);
        }
      },

      syncToDb: async () => {
        const state = get();
        try {
          const db = await getDb();
          await db.execute("UPDATE settings SET value = $1 WHERE key = 'host'", [state.host]);
          await db.execute("UPDATE settings SET value = $1 WHERE key = 'port'", [state.port.toString()]);
          await db.execute("UPDATE settings SET value = $1 WHERE key = 'user'", [state.user]);
          await db.execute("UPDATE settings SET value = $1 WHERE key = 'password'", [state.password]);
          await db.execute("UPDATE settings SET value = $1 WHERE key = 'backup_path'", [state.backupPath]);
          await db.execute("UPDATE settings SET value = $1 WHERE key = 'compress_backups'", [state.compressBackups.toString()]);
          await db.execute("UPDATE settings SET value = $1 WHERE key = 'run_on_startup'", [state.runOnStartup.toString()]);
          await db.execute("UPDATE settings SET value = $1 WHERE key = 'minimize_to_tray'", [state.minimizeToTray.toString()]);
          await db.execute("UPDATE settings SET value = $1 WHERE key = 'start_minimized'", [state.startMinimized.toString()]);
        } catch (e) {
          console.error("Failed to sync settings to DB:", e);
        }
      }
    }),
    {
      name: "backup-manager-settings",
      // Only persist appearance settings to localStorage if needed, 
      // otherwise we rely on SQLite as source of truth.
      partialize: (state) => ({ primaryColor: state.primaryColor }),
    }
  )
);
