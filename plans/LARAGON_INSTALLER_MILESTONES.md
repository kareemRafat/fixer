# Unified Milestone Plan: Version-Agnostic Laragon One-Click Installer

## Objective
Provide a "One-Click" setup for a developer environment including Laragon (Silent EXE), PHP (ZIP), and phpMyAdmin (ZIP). The setup is designed to be version-agnostic, fetching configurations from a remote server for easy updates.

---

## Milestone 1: Core Infrastructure (Rust Backend)
- [x] **Task 1.1: Extended Dependencies**
    - `reqwest` (streaming downloads), `zip` (extraction), `tokio` (async), `winreg` (PATH update), `fs2` (disk space).
- [ ] **Task 1.2: Version-Agnostic Config Loader**
    - Implement command to fetch `setup-config.json` from remote server.
    - Standardize JSON to handle any version (e.g., `php_83`, `php_84`).
- [ ] **Task 1.3: Silent EXE Installer Service**
    - Implement `install_laragon_silent(installer_path, target_dir)`.
    - Execution: `installer.exe /S /D={target_dir}\laragon`.
- [ ] **Task 1.4: Extraction & Cleanup Engine**
    - Implement `extract_zip` with target sub-directory support.
    - Implement `cleanup_assets` to delete installers/zips after successful setup.

---

## Milestone 2: Windows System Integration
- [x] **Task 2.1: Registry PATH Management**
    - Use `winreg` to update `HKEY_CURRENT_USER\Environment`.
- [x] **Task 2.2: Environment Refresh**
    - Broadcast `WM_SETTINGCHANGE` so PATH updates without system restart.
- [ ] **Task 2.3: Admin Privilege Handler**
    - Logic to check for admin rights and request elevation if Laragon installation to `C:\` fails.

---

## Milestone 3: Advanced Frontend (React)
- [x] **Task 3.1: Environment Page UI**
    - Path selector, status indicators (Installed/Not Installed), and "One-Click" button.
- [ ] **Task 3.2: Universal Installation Orchestrator**
    - Manage state for multiple components (Laragon, PHP, PMA).
    - Map `setup-config.json` keys to installation steps dynamically.
- [ ] **Task 3.3: Real-time Progress Tracking**
    - Multi-stage progress bar (Download -> Install -> Configure -> Done).

---

## Milestone 4: Smart Configuration & Post-Install
- [ ] **Task 4.1: Laragon.ini Automator**
    - Parse and update `{target_dir}\laragon\usr\laragon.ini`.
    - Set `php_version={version_from_config}` automatically.
- [ ] **Task 4.2: phpMyAdmin Setup**
    - Extract to `{target_dir}\laragon\etc\apps\phpMyAdmin`.
    - Ensure folder name is clean (no version suffixes for PMA).
- [ ] **Task 4.3: Port & Space Validation**
    - Verify Port 80/3306 availability.
    - Check disk space (>= 2GB).

---

## Milestone 5: Polish & Recovery
- [ ] **Task 5.1: Fail-Safe Recovery**
    - If a step fails (e.g., PHP download), allow "Retry Only This Step".
- [ ] **Task 5.2: Launch on Completion**
    - Automatically run `{target_dir}\laragon\laragon.exe` after setup.

---

## Technical Reference

### Execution Flow (One-Click)
1. **Fetch Config** -> Get URLs/Versions for EXE and ZIPs.
2. **Download Laragon.exe** -> Stream to Temp.
3. **Silent Install** -> Run with `/S /D=`.
4. **Download & Extract PHP** -> To `bin/php/php-{version}`.
5. **Download & Extract PMA** -> To `etc/apps/phpMyAdmin`.
6. **Apply Config** -> Update `laragon.ini` & Registry `PATH`.
7. **Cleanup** -> Delete temporary installers.
8. **Launch** -> Success notification and start Laragon.

### Remote Config Format (`setup-config.json`)
```json
{
  "laragon": {
    "url": "https://your-server.com/assets/laragon.exe",
    "version": "6.0",
    "is_exe": true
  },
  "php": {
    "url": "https://your-server.com/assets/php-8.3.zip",
    "version": "8.3.16",
    "target_subfolder": "bin/php/php-8.3"
  },
  "phpmyadmin": {
    "url": "https://your-server.com/assets/phpmyadmin.zip",
    "version": "5.2.1",
    "target_subfolder": "etc/apps/phpMyAdmin"
  }
}
```

### Key Paths (Registry)
- **PHP**: Add `{install_dir}\laragon\bin\php\php-{version}` to `Path`.
- **MySQL**: Add `{install_dir}\laragon\bin\mysql\mysql-{version}\bin` to `Path`.
