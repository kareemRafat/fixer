# Feature Plan: Backup Verification & Health Checks

This feature ensures that backups created by DBGuardX are not only saved but are also valid, restorable, and data-complete. It protects against silent data corruption and gives users 100% confidence in their disaster recovery strategy.

## Milestone 1: Sandbox Environment Infrastructure
*Goal: Create a safe, isolated environment to test-restore backups without affecting production data.*

- [ ] **Dynamic Sandbox Creation**: Implement a backend utility to generate unique temporary database names (e.g., `dbgx_verify_12345`).
- [ ] **Isolated Restore Command**: Create a specialized `verify_restore` command in Rust that imports a `.sql` or `.sql.gz` file into the temporary sandbox database.
- [ ] **Automatic Cleanup**: Implement a "Finalizer" that ensures the sandbox database is dropped (deleted) regardless of whether the verification succeeded or failed.

## Milestone 2: Verification Engine (Health Checks)
*Goal: Define the logic that determines if a backup is "Healthy".*

- [ ] **Structural Validation**: Verify that the restored database contains the same number of tables as the source.
- [ ] **Row Count Parity**: Compare total row counts for key tables between the live database and the restored version.
- [ ] **Checksum Verification**: 
    - Generate an MD5/SHA256 hash during the backup process.
    - Validate the file against this hash before attempting a restore.
- [ ] **Schema Integrity Check**: Ensure no table columns were truncated or corrupted during export.

## Milestone 3: UI/UX & Visibility
*Goal: Provide clear feedback to the user about backup health.*

- [ ] **Health Status Badges**:
    - `Verified` (Green): Passed all checks.
    - `Unverified` (Gray): Backup exists but hasn't been tested.
    - `Corrupted` (Red): Verification failed (immediate user attention required).
- [ ] **Manual Verification Trigger**: Add a "Verify Now" button to the Backups list for any existing backup file.
- [ ] **Verification Detail Modal**: A popup showing exactly what was checked (e.g., "Tables: 45/45, Rows: 10,402/10,402, Checksum: OK").

## Milestone 4: Automation & Settings
*Goal: Make verification part of the background workflow.*

- [ ] **Auto-Verify Toggle**: Add a setting in the "System & Background" card to "Automatically verify backups after completion."
- [ ] **Scheduler Integration**: Update the background worker to automatically trigger a verification pass after a scheduled backup finishes.
- [ ] **Health Alerts**: Send a system notification if an automated verification fails.

## Milestone 5: Reporting & History
*Goal: Audit logs for compliance and peace of mind.*

- [ ] **Verification Logs**: Store the results of every health check in a new `verification_history` SQLite table.
- [ ] **Health Dashboard Widget**: Add a small summary to the Dashboard showing "Total Verified Backups" and "Last Successful Health Check."
