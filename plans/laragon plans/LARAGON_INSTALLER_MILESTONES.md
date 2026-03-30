# Unified Milestone Plan: Intelligent Laragon One-Click Installer

## Objective
Provide a "One-Click" setup that downloads Laragon, waits for the user to complete the official installer, and then **automatically detects** the installation path to finish setting up PHP, phpMyAdmin, and the System PATH.

---

## Milestone 1: Intelligent Backend (Rust)
- [x] **Task 1.1: Extended Dependencies**
    - `reqwest`, `zip`, `tokio`, `winreg`, `fs2`, `winapi`, `lazy_static`.
- [ ] **Task 1.2: Registry Path Detector**
    - Implement `detect_laragon_path()` in Rust.
    - Logic: Read `HKEY_CURRENT_USER\Software\Laragon` (or `HKEY_LOCAL_MACHINE`) to find the `Path` key.
- [ ] **Task 1.3: Interactive Installer Runner**
    - Update `run_laragon_installer()` to run the `.exe` *without* silent flags.
    - Use `Command::spawn().wait()` to wait for the user to finish the installer.
- [x] **Task 1.4: Extraction & Cleanup Engine**
    - Already implemented; needs to be updated to use the *detected* path instead of a user-provided one.

---

## Milestone 2: Windows System Integration
- [x] **Task 2.1: Registry PATH Management**
    - Implemented.
- [x] **Task 2.2: Environment Refresh**
    - Implemented.
- [ ] **Task 2.3: Multi-Path Support**
    - Ensure both PHP and MySQL paths are added correctly based on the detected folder.

---

## Milestone 3: Simplified Frontend (React)
- [ ] **Task 3.1: Zero-Config UI**
    - Remove the Path Input and Browse buttons from `Environment.tsx`.
    - UI only shows the "Admin Warning" and a large "Start Installation" button.
- [x] **Task 3.2: Universal Installation Orchestrator**
    - Orchestrated in the backend.
- [x] **Task 3.3: Real-time Progress Tracking**
    - Updates as components are added to the detected path.

---

## Technical Reference

### New Execution Flow
1. **Fetch Config** -> Get download URLs.
2. **Download Laragon.exe** -> Stream to Temp.
3. **Run Installer** -> Open the UI installer for the user.
4. **Wait** -> App stays in "Installing..." state until the user finishes the Laragon wizard.
5. **Detect Path** -> Read Registry `HKCU\Software\Laragon` to get the actual installation directory.
6. **Extract PHP & PMA** -> Target the `bin/php` and `etc/apps` folders inside that detected path.
7. **Configure** -> Update `laragon.ini` and System `PATH`.
8. **Cleanup & Launch** -> Success notification.

### Registry Detection
- **Key**: `HKEY_CURRENT_USER\Software\Laragon` (or `HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Laragon`)
- **Value**: `Path` or `(Default)` folder location.
