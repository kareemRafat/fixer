# Project Plan: Local Database Backup Manager

This document outlines the detailed milestones and tasks for the development of the Local Database Backup Manager, based on the `Architecture.md` and initial `PLAN.md`.

## Milestone 1: Foundation & Project Setup
- [x] Initialize Tauri project with React (TypeScript) and Vite.
- [x] Setup Tailwind CSS and shadcn/ui.
- [x] Configure project directory structure as per `Architecture.md`.
- [x] Setup basic Rust backend modules (`commands/`, `services/`).
- [x] Implement a basic "Ping" command to verify Tauri-to-Rust communication.

## Milestone 2: UI Shell & Navigation
- [x] Implement the `MainLayout` component (Sidebar + Content area).
- [x] Setup `react-router-dom` for navigation.
- [x] Create page stubs for:
    - Dashboard
    - Databases
    - Backups
    - Diagnostics
    - Settings
- [x] Implement global state management (e.g., Zustand or React Context) for settings.

## Milestone 3: Database Detection (MySQL/MariaDB)
- [x] **Backend**: Implement `detect_services` to find local MySQL/Apache instances.
- [x] **Backend**: Implement `list_databases` using `mysql` CLI or library.
- [x] **Frontend**: Build the "Databases" page to display detected databases.
- [x] **Frontend**: Add "Manual Connection" settings for custom ports/credentials.

## Milestone 4: Core Backup Engine
- [x] **Backend**: Implement `run_backup` command using `mysqldump`.
- [x] **Backend**: Implement `filesystem::ensure_backup_dir` to manage storage paths.
- [x] **Frontend**: Implement "Backup Now" functionality with a progress overlay.
- [x] **Backend**: Implement basic error handling for failed dumps (e.g., permission issues).

## Milestone 5: Backup History & Metadata
- [x] Setup a local SQLite database (via `tauri-plugin-sql`) to store backup history.
- [x] **Frontend**: Build the "Backups" page with a table showing:
    - Database Name
    - Timestamp
    - File Size
    - Status (Success/Fail)
- [x] Implement "Delete Backup" (file + record removal).

## Milestone 6: Restore Functionality
- [x] **Backend**: Implement `run_restore` command using `mysql` import.
- [x] **Backend**: Add validation logic to check if a SQL file is a valid backup.
- [x] **Frontend**: Add "Restore" action with a safety confirmation dialog.

## Milestone 7: Advanced File Operations
- [x] **Backend**: Implement "Raw Backup" (direct folder copy for `data/` dir).
- [x] **Backend**: Integrate compression (Zlib/Gzip) for `.sql` exports.
- [x] **Frontend**: Add toggle in Settings for "Compress Backups".

## Milestone 8: System Diagnostics & Port Fixer
- [ ] **Backend**: Implement port conflict detection (check if 3306/80 are in use).
- [ ] **Backend**: Implement `fix_port_conflict` (editing `.ini`/`.conf` files).
- [ ] **Frontend**: Build the "Diagnostics" page with "Auto-Fix" buttons.

## Milestone 9: Automation & Notifications
- [ ] **Backend**: Implement a basic Rust scheduler service for recurring backups.
- [ ] **Frontend**: Add "Scheduling" UI to the Settings/Database page.
- [ ] Integrate Tauri system notifications for backup results.

## Milestone 10: Polishing & Distribution
- [ ] Add dark/light mode support.
- [ ] Conduct final UI/UX audit using shadcn/ui components.
- [ ] Configure `tauri.conf.json` for production (icons, bundle identifiers).
- [ ] Build and test the installer for the target OS (Windows).
