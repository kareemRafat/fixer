import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  backupPath: string;
  autoDetectServices: boolean;
  compressBackups: boolean;
  // Database connection settings
  host: string;
  port: number;
  user: string;
  password: string;
  
  setBackupPath: (path: string) => void;
  setAutoDetectServices: (enabled: boolean) => void;
  setCompressBackups: (enabled: boolean) => void;
  setHost: (host: string) => void;
  setPort: (port: number) => void;
  setUser: (user: string) => void;
  setPassword: (password: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      backupPath: "",
      autoDetectServices: true,
      compressBackups: false,
      host: "localhost",
      port: 3306,
      user: "root",
      password: "",

      setBackupPath: (path) => set({ backupPath: path }),
      setAutoDetectServices: (enabled) => set({ autoDetectServices: enabled }),
      setCompressBackups: (enabled) => set({ compressBackups: enabled }),
      setHost: (host) => set({ host }),
      setPort: (port) => set({ port: Number(port) }),
      setUser: (user) => set({ user }),
      setPassword: (password) => set({ password }),
    }),
    {
      name: "backup-manager-settings",
    }
  )
);
