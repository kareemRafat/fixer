# Complete Application User Guide

This application is designed to help you manage, protect, and repair MySQL/MariaDB databases for development environments like XAMPP and Laragon with ease.

---

## 🏠 Dashboard
Provides a quick overview of your system:
*   **Service Status:** Monitor if MySQL and Apache are running correctly.
*   **Quick Statistics:** View the total number of databases and backups.
*   **System Alerts:** Get notified about port conflicts or connection issues.

## 🗄️ Databases
The central hub for managing your live databases:
*   **List Databases:** View all databases (excluding system-only tables).
*   **Quick Backup:** One-click backup for any specific database.
*   **Search Feature:** Easily find a specific database from a large list.

## 💾 Backups
Manage your saved data files:
*   **File Management:** View all previous backups with timestamps and file sizes.
*   **Restore Data:** Restore a full database from a `.sql` file or compressed backup.
*   **Raw Backup/Restore:** A powerful feature to backup binary data folders directly for maximum safety.
*   **Validation:** Verify backup file integrity before attempting a restore.

## 📅 Schedules
Automate your data protection:
*   **Automatic Backups:** Set the app to run backups daily or weekly.
*   **Task Management:** Monitor and modify scheduled tasks.

## 🔍 Diagnostics & Repair
The ultimate tool for fixing technical errors:
*   **Port Monitoring:** See what is using Port 3306 (MySQL) and Port 80 (Apache).
*   **Kill Processes:** Solve "Ghost Process" issues that prevent XAMPP from starting.
*   **Auto-Fix Configuration:** Automatically change the MySQL port in configuration files (`my.ini`) with one click.

## ⚙️ Settings
Tailor the application to your local environment:
*   **Connection Data:** Set your MySQL host, user, and password.
*   **System Paths:** Point the app to your XAMPP or Laragon data folders.
*   **Auto-Detection:** One button to find XAMPP on your PC and configure paths automatically.
