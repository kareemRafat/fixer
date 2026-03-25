# Implementation Plan: Background Execution & Autostart

This plan outlines the steps to allow the application to remain active in the system tray and start automatically with the operating system.

## Milestone 1: System Tray Integration
- [x] **Tauri Configuration**: Add tray icon configurations. (Handled in Rust code for v2)
- [x] **Tray Menu**: Implement a native system tray menu in Rust (`src-tauri/src/lib.rs`) with options:
    - `Show DBGuardX` (Restores the main window)
    - `Exit DBGuardX` (Completely terminates the application)
- [x] **Window Event Handling**: Modify the window "Close" event to intercept the exit signal and hide the window instead of closing the process (Dynamic based on user setting).
- [x] **Tray Icons**: Add appropriate icons for the system tray (using default app icon).

## Milestone 2: Autostart Functionality
- [x] **Plugin Setup**: Integrate `tauri-plugin-autostart` into the Rust backend and React frontend.
- [x] **Boot Logic**: Implement logic to detect if the app was started via autostart (`--minimized` flag) to ensure it begins hidden in the tray.
- [x] **Permissions**: Ensure the app has the necessary permissions (added to `capabilities/default.json`).

## Milestone 3: Settings & UI Integration
- [x] **State Management**: Update `useSettingsStore.ts` to include:
    - `runOnStartup`: boolean
    - `minimizeToTray`: boolean
    - `startMinimized`: boolean
- [x] **Frontend UI**: Update the **Settings** page (`src/pages/Settings.tsx`) with a new "System & Background" section.
- [x] **Backend Commands**: Created `update_minimize_to_tray` command to sync UI settings with Rust window event listener.

## Milestone 4: Scheduler Enhancements
- [x] **Status Indication**: Add a visual indicator in the UI (pulsing dot in sidebar) and tray menu (Status item).
- [x] **Notification Refinement**: Ensure system notifications work correctly even when the app is minimized to the tray. (Integrated in `scheduler.rs`)

## Milestone 5: Validation & Testing
- [ ] **Test Case 1**: Verify clicking "X" hides the window to the tray when the setting is enabled.
- [ ] **Test Case 2**: Verify the "Exit" option in the tray menu successfully kills the process.
- [ ] **Test Case 3**: Restart the computer and verify the app launches automatically in the background.
- [ ] **Test Case 4**: Verify a scheduled backup triggers correctly while the app is minimized.
