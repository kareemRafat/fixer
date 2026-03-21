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
    mysql_data_path: &str,
) -> Result<String, String> {
    let path = std::path::Path::new(file_path);
    
    // Check if it's a Raw Backup (Directory)
    if path.is_dir() {
        if mysql_data_path.is_empty() {
            return Err("MySQL Data Path is not configured in settings.".to_string());
        }
        
        let target_dir = std::path::Path::new(mysql_data_path).join(db_name);
        let source_dir = file_path;

        // Use robocopy to restore the directory
        let output = Command::new("robocopy")
            .args([source_dir, target_dir.to_str().unwrap(), "/E", "/MT:32", "/R:3", "/W:5"])
            .output();

        match output {
            Ok(output) => {
                let code = output.status.code().unwrap_or(0);
                if code <= 8 {
                    Ok(format!("Raw restore of {} completed successfully.", db_name))
                } else {
                    Err(format!("Robocopy failed with code {}: {}", code, String::from_utf8_lossy(&output.stderr)))
                }
            }
            Err(e) => Err(format!("Failed to execute robocopy: {}", e)),
        }
    } else {
        // SQL Restore (Standard or Compressed)
        let mut actual_file_to_restore = file_path.to_string();
        let mut temp_file = None;

        // If it's a Gzip file, decompress it first
        if file_path.ends_with(".gz") {
            use flate2::read::GzDecoder;
            use std::io::prelude::*;

            let decompressed_path = file_path.trim_end_matches(".gz").to_string();
            let mut input = GzDecoder::new(std::fs::File::open(file_path).map_err(|e| e.to_string())?);
            let mut output = std::fs::File::create(&decompressed_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut input, &mut output).map_err(|e| e.to_string())?;
            
            actual_file_to_restore = decompressed_path.clone();
            temp_file = Some(decompressed_path);
        }

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

        if let Ok(output) = create_output {
            if !output.status.success() {
                return Err(format!(
                    "Failed to ensure database exists: {}",
                    String::from_utf8_lossy(&output.stderr)
                ));
            }
        }

        // 2. Specify the database to restore into
        args.push(db_name.to_string());
        
        let file = std::fs::File::open(&actual_file_to_restore).map_err(|e| format!("Failed to open backup file: {}", e))?;
        
        let output = Command::new("mysql")
            .args(&args)
            .stdin(file)
            .output();

        // Cleanup temp file if we decompressed one
        if let Some(temp) = temp_file {
            let _ = std::fs::remove_file(temp);
        }

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
}

pub fn validate_backup_file(file_path: &str) -> Result<bool, String> {
    let content = match std::fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return Err("لم يتم العثور على ملف النسخة الاحتياطية. قد يكون قد تم حذفه أو نقله.".to_string()),
    };
    
    // Simple check for MySQL dump header
    if content.contains("-- MySQL dump") || content.contains("-- MariaDB dump") {
        Ok(true)
    } else {
        Err("تنسيق ملف النسخة الاحتياطية غير صالح.".to_string())
    }
}

pub fn compress_file(source_path: &str, dest_path: &str) -> Result<(), String> {
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::prelude::*;

    let mut input = std::fs::File::open(source_path)
        .map_err(|e| format!("Failed to open source file: {}", e))?;
    let output = std::fs::File::create(dest_path)
        .map_err(|e| format!("Failed to create destination file: {}", e))?;
    
    let mut encoder = GzEncoder::new(output, Compression::default());
    std::io::copy(&mut input, &mut encoder)
        .map_err(|e| format!("Compression failed: {}", e))?;
    
    encoder.finish()
        .map_err(|e| format!("Failed to finish compression: {}", e))?;
    
    Ok(())
}

pub fn run_raw_backup(source_dir: &str, dest_dir: &str) -> Result<String, String> {
    // Basic folder copy for MySQL data directory
    // In a production app, we might want to check if the service is stopped
    // or use a more robust copy method like robocopy on Windows.
    
    let source_path = std::path::Path::new(source_dir);
    let dest_path = std::path::Path::new(dest_dir);

    if !source_path.exists() {
        return Err(format!("Source directory does not exist: {}", source_dir));
    }

    // Use robocopy on Windows for efficient directory copy
    let output = Command::new("robocopy")
        .args([source_dir, dest_dir, "/E", "/MT:32", "/R:3", "/W:5"])
        .output();

    match output {
        Ok(output) => {
            // robocopy exit codes 0-7 are successful
            let code = output.status.code().unwrap_or(0);
            if code <= 8 {
                Ok(format!("Raw backup of {} completed successfully.", source_dir))
            } else {
                Err(format!("Robocopy failed with code {}: {}", code, String::from_utf8_lossy(&output.stderr)))
            }
        }
        Err(e) => Err(format!("Failed to execute robocopy: {}", e)),
    }
}

pub fn detect_xampp_data_path() -> Option<String> {
    let common_paths = [
        "C:\\xampp\\mysql\\data",
        "D:\\xampp\\mysql\\data",
        "C:\\laragon\\bin\\mysql", // Laragon base
        "C:\\laragon\\bin\\mariadb", // Laragon MariaDB base
        "C:\\wamp64\\bin\\mysql", // WAMP base
        "C:\\wamp\\bin\\mysql", // WAMP 32-bit base
    ];

    for path in common_paths {
        let p = std::path::Path::new(path);
        if p.exists() {
            // If it's a direct data folder (XAMPP style)
            if path.ends_with("data") {
                return Some(path.to_string());
            }

            // For Laragon/WAMP, we need to look one level deeper for the data folder
            // e.g., C:\laragon\bin\mysql\mysql-8.0.30\data
            if let Ok(entries) = std::fs::read_dir(p) {
                for entry in entries.flatten() {
                    let sub_path = entry.path().join("data");
                    if sub_path.exists() {
                        return Some(sub_path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    None
}

