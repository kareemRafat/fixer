import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

interface ProgressPayload {
  component: string;
  progress: number;
  status: string;
}

interface DetectedEnvironments {
  laragon: boolean;
  xampp: boolean;
  wamp: boolean;
}

interface EnvironmentState {
  installing: boolean;
  progress: number;
  status: string;
  currentComponent: string;
  isLaragonInstalled: boolean | null;
  detectedEnvironments: DetectedEnvironments | null;
  
  setInstalling: (installing: boolean) => void;
  setProgress: (progress: number) => void;
  setStatus: (status: string) => void;
  setCurrentComponent: (component: string) => void;
  setIsLaragonInstalled: (installed: boolean | null) => void;
  
  checkLaragon: () => Promise<void>;
  checkEnvironments: () => Promise<void>;
  startInstall: (configUrl: string) => Promise<void>;
  cancelInstall: () => Promise<void>;
  initListeners: () => () => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  installing: false,
  progress: 0,
  status: "Ready to install",
  currentComponent: "",
  isLaragonInstalled: null,
  detectedEnvironments: null,

  setInstalling: (installing) => set({ installing }),
  setProgress: (progress) => set({ progress }),
  setStatus: (status) => set({ status }),
  setCurrentComponent: (component) => set({ currentComponent: component }),
  setIsLaragonInstalled: (installed) => set({ isLaragonInstalled: installed }),

  checkLaragon: async () => {
    try {
      const installed = await invoke<boolean>("is_laragon_installed");
      set({ isLaragonInstalled: installed });
    } catch (e) {
      console.error("Failed to check Laragon installation:", e);
      set({ isLaragonInstalled: false });
    }
  },

  checkEnvironments: async () => {
    try {
      const detected = await invoke<DetectedEnvironments>("get_detected_environments");
      set({ 
        detectedEnvironments: detected,
        isLaragonInstalled: detected.laragon
      });
    } catch (e) {
      console.error("Failed to detect environments:", e);
    }
  },

  startInstall: async (configUrl: string) => {
    try {
      set({ installing: true, progress: 0, status: "Starting installation..." });
      await invoke("start_one_click_install", { configUrl });
      
      const currentStatus = get().status;
      if (currentStatus !== "Cancelled") {
        set({ isLaragonInstalled: true });
      }
    } catch (error) {
      if (error === "Cancelled") {
        set({ status: "Cancelled" });
      } else {
        console.error(error);
        set({ status: `Error: ${error}` });
      }
    } finally {
      set({ installing: false });
    }
  },

  cancelInstall: async () => {
    try {
      await invoke("cancel_install");
      set({ status: "Cancelling..." });
    } catch (e) {
      console.error(e);
    }
  },

  initListeners: () => {
    let unlistenProgress: any;
    let unlistenStatus: any;

    const setup = async () => {
      unlistenProgress = await listen<ProgressPayload>(
        "install-progress",
        (event) => {
          set({ 
            progress: event.payload.progress,
            currentComponent: event.payload.component
          });
        }
      );

      unlistenStatus = await listen<string>("install-status", (event) => {
        set({ status: event.payload });
      });
    };

    setup();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenStatus) unlistenStatus();
    };
  },
}));
