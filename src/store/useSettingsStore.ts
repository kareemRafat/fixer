import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  backupPath: string;
  autoDetectServices: boolean;
  compressBackups: boolean;
  setBackupPath: (path: string) => void;
  setAutoDetectServices: (enabled: boolean) => void;
  setCompressBackups: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      backupPath: "",
      autoDetectServices: true,
      compressBackups: false,
      setBackupPath: (path) => set({ backupPath: path }),
      setAutoDetectServices: (enabled) => set({ autoDetectServices: enabled }),
      setCompressBackups: (enabled) => set({ compressBackups: enabled }),
    }),
    {
      name: "backup-manager-settings",
    }
  )
);
