use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct DetectedService {
    pub name: String,
    pub status: String,
    pub port: u16,
    pub service_type: String, // "mysql" or "apache"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub tables_count: usize,
    pub size_mb: f64,
}

pub fn detect_services() -> Vec<DetectedService> {
    let mut services = Vec::new();

    // On Windows, check for MySQL and Apache services using 'sc query'
    // This is a basic implementation, can be expanded
    let output = Command::new("sc")
        .args(["query", "type=", "service", "state=", "all"])
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Check for common MySQL service names
        if stdout.contains("SERVICE_NAME: MySQL") || stdout.contains("SERVICE_NAME: mariadb") {
            services.push(DetectedService {
                name: "MySQL/MariaDB".to_string(),
                status: "Detected".to_string(), // In a real app, parse status from sc output
                port: 3306,
                service_type: "mysql".to_string(),
            });
        }

        // Check for common Apache service names (e.g., from XAMPP)
        if stdout.contains("SERVICE_NAME: Apache") {
            services.push(DetectedService {
                name: "Apache".to_string(),
                status: "Detected".to_string(),
                port: 80,
                service_type: "apache".to_string(),
            });
        }
    }

    services
}

pub fn list_databases(
    host: &str,
    port: u16,
    user: &str,
    password: &str,
) -> Result<Vec<DatabaseInfo>, String> {
    let mut args = vec![
        "-h".to_string(),
        host.to_string(),
        "-P".to_string(),
        port.to_string(),
        "-u".to_string(),
        user.to_string(),
    ];

    if !password.is_empty() {
        args.push(format!("-p{}", password));
    }

    args.push("-e".to_string());
    args.push("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys');".to_string());

    let output = Command::new("mysql").args(&args).output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut dbs = Vec::new();
                for line in stdout.lines().skip(1) {
                    // Skip header
                    if !line.trim().is_empty() {
                        dbs.push(DatabaseInfo {
                            name: line.trim().to_string(),
                            tables_count: 0, // Placeholder
                            size_mb: 0.0,    // Placeholder
                        });
                    }
                }
                Ok(dbs)
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

pub fn run_backup(
    host: &str,
    port: u16,
    user: &str,
    password: &str,
    databases: Vec<String>,
    dest_path: &str,
) -> Result<String, String> {
    let mut args = vec![
        "-h".to_string(),
        host.to_string(),
        "-P".to_string(),
        port.to_string(),
        "-u".to_string(),
        user.to_string(),
    ];

    if !password.is_empty() {
        args.push(format!("-p{}", password));
    }

    if databases.len() > 1 {
        args.push("--databases".to_string());
    }

    for db in &databases {
        args.push(db.clone());
    }

    args.push("--result-file".to_string());
    args.push(dest_path.to_string());

    let output = Command::new("mysqldump").args(&args).output();

    match output {
        Ok(output) => {
            if output.status.success() {
                if databases.len() > 1 {
                    Ok(format!(
                        "Backup of {} databases completed successfully.",
                        databases.len()
                    ))
                } else {
                    Ok(format!(
                        "Backup of {} completed successfully.",
                        databases[0]
                    ))
                }
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

pub fn run_restore(
    host: &str,
    port: u16,
    user: &str,
    password: &str,
    db_name: &str,
    file_path: &str,
) -> Result<String, String> {
    let mut args = vec![
        "-h".to_string(),
        host.to_string(),
        "-P".to_string(),
        port.to_string(),
        "-u".to_string(),
        user.to_string(),
    ];

    if !password.is_empty() {
        args.push(format!("-p{}", password));
    }

    // 1. Ensure the database exists before restoring
    let mut create_db_args = args.clone();
    create_db_args.push("-e".to_string());
    create_db_args.push(format!("CREATE DATABASE IF NOT EXISTS `{}`;", db_name));

    let create_output = Command::new("mysql")
        .args(&create_db_args)
        .output();

    match create_output {
        Ok(output) => {
            if !output.status.success() {
                return Err(format!(
                    "Failed to ensure database exists: {}",
                    String::from_utf8_lossy(&output.stderr)
                ));
            }
        }
        Err(e) => return Err(format!("Failed to execute mysql command: {}", e)),
    }

    // 2. Specify the database to restore into
    args.push(db_name.to_string());
    
    // Read the file and pipe it to mysql command
    let file = std::fs::File::open(file_path).map_err(|e| format!("Failed to open backup file: {}", e))?;
    
    let output = Command::new("mysql")
        .args(&args)
        .stdin(file)
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                Ok(format!("Restore of {} completed successfully.", db_name))
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

pub fn validate_backup_file(file_path: &str) -> Result<bool, String> {
    let content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file for validation: {}", e))?;
    
    // Simple check for MySQL dump header
    if content.contains("-- MySQL dump") || content.contains("-- MariaDB dump") {
        Ok(true)
    } else {
        Ok(false)
    }
}
