use crate::services::diagnostics::check_port_usage;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

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
    let mut detected_ports = std::collections::HashSet::new();

    // 1. Port-based detection (Most reliable for all stacks)
    let mysql_ports = [3306, 3307, 3308];
    for &port in &mysql_ports {
        let status = check_port_usage(port);
        if status.is_in_use {
            let name = status.process_name.unwrap_or_else(|| "MySQL/MariaDB".to_string());
            let name_lower = name.to_lowercase();
            if name_lower.contains("mysql") || name_lower.contains("mariadb") {
                services.push(DetectedService {
                    name: format!("{} ({})", name, port),
                    status: "Running".to_string(),
                    port,
                    service_type: "mysql".to_string(),
                });
                detected_ports.insert(port);
            }
        }
    }

    let apache_ports = [80, 8080, 443];
    for &port in &apache_ports {
        let status = check_port_usage(port);
        if status.is_in_use {
            let name = status.process_name.unwrap_or_else(|| "Web Server".to_string());
            let name_lower = name.to_lowercase();
            if name_lower.contains("httpd") || name_lower.contains("apache") || name_lower.contains("nginx") {
                services.push(DetectedService {
                    name: format!("{} ({})", name, port),
                    status: "Running".to_string(),
                    port,
                    service_type: "apache".to_string(),
                });
                detected_ports.insert(port);
            }
        }
    }

    // 2. Service-based detection (Fallback/Supplemental)
    let mut cmd = Command::new("sc");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .args(["query", "type=", "service", "state=", "all"])
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Check for common MySQL service names
        if (stdout.contains("SERVICE_NAME: MySQL") || stdout.contains("SERVICE_NAME: mariadb") || stdout.contains("SERVICE_NAME: laragonmysql")) 
           && !detected_ports.contains(&3306) {
            services.push(DetectedService {
                name: "MySQL/MariaDB Service".to_string(),
                status: "Detected".to_string(),
                port: 3306,
                service_type: "mysql".to_string(),
            });
        }

        // Check for common Apache service names
        if (stdout.contains("SERVICE_NAME: Apache") || stdout.contains("SERVICE_NAME: laragonapache")) 
           && !detected_ports.contains(&80) {
            services.push(DetectedService {
                name: "Apache Service".to_string(),
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
    args.push("SELECT table_schema, COUNT(*), SUM(data_length + index_length) / 1024 / 1024 FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys') GROUP BY table_schema;".to_string());

    let mut cmd = Command::new("mysql");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd.args(&args).output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut dbs = Vec::new();
                for line in stdout.lines().skip(1) {
                    // Skip header
                    if !line.trim().is_empty() {
                        let parts: Vec<&str> = line.split('\t').collect();
                        if parts.len() >= 3 {
                            dbs.push(DatabaseInfo {
                                name: parts[0].to_string(),
                                tables_count: parts[1].parse().unwrap_or(0),
                                size_mb: parts[2].parse().unwrap_or(0.0),
                            });
                        }
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

    let mut cmd = Command::new("mysqldump");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd.args(&args).output();

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
        let mut cmd = Command::new("robocopy");
        #[cfg(windows)]
        cmd.creation_flags(0x08000000);

        let output = cmd
            .args([
                source_dir,
                target_dir.to_str().unwrap(),
                "/E",
                "/MT:32",
                "/R:3",
                "/W:5",
            ])
            .output();

        match output {
            Ok(output) => {
                let code = output.status.code().unwrap_or(0);
                if code <= 8 {
                    Ok(format!(
                        "Raw restore of {} completed successfully.",
                        db_name
                    ))
                } else {
                    Err(format!(
                        "Robocopy failed with code {}: {}",
                        code,
                        String::from_utf8_lossy(&output.stderr)
                    ))
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

            let decompressed_path = file_path.trim_end_matches(".gz").to_string();
            let mut input =
                GzDecoder::new(std::fs::File::open(file_path).map_err(|e| e.to_string())?);
            let mut output =
                std::fs::File::create(&decompressed_path).map_err(|e| e.to_string())?;
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

        let mut create_cmd = Command::new("mysql");
        #[cfg(windows)]
        create_cmd.creation_flags(0x08000000);

        let create_output = create_cmd.args(&create_db_args).output();

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

        let file = std::fs::File::open(&actual_file_to_restore)
            .map_err(|e| format!("Failed to open backup file: {}", e))?;

        let mut restore_cmd = Command::new("mysql");
        #[cfg(windows)]
        restore_cmd.creation_flags(0x08000000);

        let output = restore_cmd.args(&args).stdin(file).output();

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
        Err(_) => {
            return Err(
                "لم يتم العثور على ملف النسخة الاحتياطية. قد يكون قد تم حذفه أو نقله.".to_string(),
            )
        }
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

    let mut input = std::fs::File::open(source_path)
        .map_err(|e| format!("Failed to open source file: {}", e))?;
    let output = std::fs::File::create(dest_path)
        .map_err(|e| format!("Failed to create destination file: {}", e))?;

    let mut encoder = GzEncoder::new(output, Compression::default());
    std::io::copy(&mut input, &mut encoder).map_err(|e| format!("Compression failed: {}", e))?;

    encoder
        .finish()
        .map_err(|e| format!("Failed to finish compression: {}", e))?;

    Ok(())
}

pub fn run_raw_backup(source_dir: &str, dest_dir: &str) -> Result<String, String> {
    // Basic folder copy for MySQL data directory
    // In a production app, we might want to check if the service is stopped
    // or use a more robust copy method like robocopy on Windows.

    let source_path = std::path::Path::new(source_dir);

    if !source_path.exists() {
        return Err(format!("Source directory does not exist: {}", source_dir));
    }

    // Use robocopy on Windows for efficient directory copy
    let mut cmd = Command::new("robocopy");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .args([source_dir, dest_dir, "/E", "/MT:32", "/R:3", "/W:5"])
        .output();

    match output {
        Ok(output) => {
            // robocopy exit codes 0-7 are successful
            let code = output.status.code().unwrap_or(0);
            if code <= 8 {
                Ok(format!(
                    "Raw backup of {} completed successfully.",
                    source_dir
                ))
            } else {
                Err(format!(
                    "Robocopy failed with code {}: {}",
                    code,
                    String::from_utf8_lossy(&output.stderr)
                ))
            }
        }
        Err(e) => Err(format!("Failed to execute robocopy: {}", e)),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationResult {
    pub success: bool,
    pub message: String,
    pub tables_count: usize,
    pub sandbox_name: String,
}

pub fn verify_backup(
    host: &str,
    port: u16,
    user: &str,
    password: &str,
    file_path: &str,
) -> Result<VerificationResult, String> {
    use std::time::{SystemTime, UNIX_EPOCH};

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    
    let sandbox_name = format!("dbgx_verify_{}", timestamp);

    // 1. Create the sandbox database
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

    let mut create_db_args = args.clone();
    create_db_args.push("-e".to_string());
    create_db_args.push(format!("CREATE DATABASE `{}`;", sandbox_name));

    let mut create_cmd = Command::new("mysql");
    #[cfg(windows)]
    create_cmd.creation_flags(0x08000000);

    let create_output = create_cmd.args(&create_db_args).output();

    if let Err(e) = create_output {
        return Err(format!("Failed to execute mysql to create sandbox: {}", e));
    } else if let Ok(output) = create_output {
        if !output.status.success() {
            return Err(format!(
                "Failed to create sandbox database: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
    }

    // 2. Restore into sandbox
    // Note: We don't need mysql_data_path for SQL verify
    let restore_res = run_restore(host, port, user, password, &sandbox_name, file_path, "");

    // 3. Check results and cleanup
    let final_res = match restore_res {
        Ok(_) => {
            // Count tables in sandbox
            let mut count_args = args.clone();
            count_args.push("-N".to_string()); // Skip headers
            count_args.push("-e".to_string());
            count_args.push(format!(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '{}';",
                sandbox_name
            ));

            let mut count_cmd = Command::new("mysql");
            #[cfg(windows)]
            count_cmd.creation_flags(0x08000000);

            let count_output = count_cmd.args(&count_args).output();
            let tables_count = if let Ok(output) = count_output {
                String::from_utf8_lossy(&output.stdout)
                    .trim()
                    .parse()
                    .unwrap_or(0)
            } else {
                0
            };

            Ok(VerificationResult {
                success: true,
                message: format!("Verification successful. Restored {} tables.", tables_count),
                tables_count,
                sandbox_name: sandbox_name.clone(),
            })
        }
        Err(e) => Ok(VerificationResult {
            success: false,
            message: format!("Verification failed during restore: {}", e),
            tables_count: 0,
            sandbox_name: sandbox_name.clone(),
        }),
    };

    // 4. Cleanup sandbox
    let mut drop_args = args.clone();
    drop_args.push("-e".to_string());
    drop_args.push(format!("DROP DATABASE `{}`;", sandbox_name));

    let mut drop_cmd = Command::new("mysql");
    #[cfg(windows)]
    drop_cmd.creation_flags(0x08000000);

    let _ = drop_cmd.args(&drop_args).output();

    final_res
}

pub fn detect_xampp_data_path() -> Option<String> {
    let drives = ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    let base_patterns = [
        "xampp\\mysql\\data",
        "laragon\\bin\\mysql",
        "laragon\\bin\\mariadb",
        "wamp64\\bin\\mysql",
        "wamp\\bin\\mysql",
        "mysql\\data",
        "ProgramData\\MySQL",
    ];

    for drive in drives {
        for pattern in base_patterns {
            let path = format!("{}:\\{}", drive, pattern);
            let p = std::path::Path::new(&path);
            
            if p.exists() {
                // If it's a direct data folder (XAMPP style)
                if path.ends_with("data") {
                    return Some(path);
                }

                // For MySQL Installer (ProgramData)
                if pattern == "ProgramData\\MySQL" {
                    if let Ok(entries) = std::fs::read_dir(p) {
                        for entry in entries.flatten() {
                            let sub_path = entry.path().join("Data");
                            if sub_path.exists() {
                                return Some(sub_path.to_string_lossy().to_string());
                            }
                        }
                    }
                    continue;
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
    }
    None
}
