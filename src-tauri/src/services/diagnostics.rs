use serde::{Deserialize, Serialize};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct PortStatus {
    pub port: u16,
    pub is_in_use: bool,
    pub process_name: Option<String>,
    pub pid: Option<u32>,
}

pub fn check_port_usage(port: u16) -> PortStatus {
    // Run netstat -ano
    let mut cmd = Command::new("cmd");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let output = cmd
        .args(["/C", "netstat -ano"])
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let port_suffix = format!(":{}", port);
        
        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            // Typical line: TCP    0.0.0.0:3306           0.0.0.0:0              LISTENING       1234
            if parts.len() >= 4 && parts[1].ends_with(&port_suffix) && parts[parts.len()-2] == "LISTENING" {
                if let Some(pid_str) = parts.last() {
                    if let Ok(pid) = pid_str.parse::<u32>() {
                        // Try to get process name from PID
                        let mut name_cmd = Command::new("tasklist");
                        #[cfg(windows)]
                        name_cmd.creation_flags(0x08000000);

                        let name_output = name_cmd
                            .args(["/FI", &format!("PID eq {}", pid), "/NH", "/FO", "CSV"])
                            .output();

                        let mut process_name = None;
                        if let Ok(name_out) = name_output {
                            let name_stdout = String::from_utf8_lossy(&name_out.stdout);
                            if let Some(name_line) = name_stdout.lines().next() {
                                if let Some(name) = name_line.split(',').next() {
                                    process_name = Some(name.trim_matches('"').to_string());
                                }
                            }
                        }

                        return PortStatus {
                            port,
                            is_in_use: true,
                            process_name,
                            pid: Some(pid),
                        };
                    }
                }
            }
        }
    }

    PortStatus {
        port,
        is_in_use: false,
        process_name: None,
        pid: None,
    }
}

pub fn kill_process(pid: u32) -> Result<(), String> {
    let mut cmd = Command::new("taskkill");
    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .args(["/F", "/PID", &pid.to_string()])
        .output();

    match output {
        Ok(out) => {
            if out.status.success() {
                Ok(())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

pub fn find_config_file(service_type: &str) -> Option<String> {
    let drives = ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    
    for drive in drives {
        // 1. Laragon specific (read laragon.ini for active version)
        let laragon_base = format!("{}:\\laragon", drive);
        if std::path::Path::new(&laragon_base).exists() {
            let ini_path = format!("{}\\usr\\laragon.ini", laragon_base);
            if let Ok(content) = std::fs::read_to_string(&ini_path) {
                let mut version = None;
                let section_header = if service_type == "mysql" { "[mysql]" } else { "[apache]" };
                let mut in_section = false;

                for line in content.lines() {
                    let line = line.trim();
                    if line.to_lowercase().starts_with(section_header) {
                        in_section = true;
                        continue;
                    }
                    if line.starts_with('[') && line.ends_with(']') {
                        in_section = false;
                        continue;
                    }
                    if in_section && line.contains("Version=") {
                        version = Some(line.split('=').nth(1).unwrap_or("").trim().to_string());
                        break;
                    }
                }

                if let Some(ver) = version {
                    if service_type == "mysql" {
                        let sub_dirs = ["mysql", "mariadb"];
                        for sub in sub_dirs {
                            let p1 = format!("{}\\bin\\{}\\{}\\my.ini", laragon_base, sub, ver);
                            let p2 = format!("{}\\bin\\{}\\{}\\bin\\my.ini", laragon_base, sub, ver);
                            if std::path::Path::new(&p1).exists() { return Some(p1); }
                            if std::path::Path::new(&p2).exists() { return Some(p2); }
                        }
                    } else if service_type == "apache" {
                        let p = format!("{}\\bin\\apache\\{}\\conf\\httpd.conf", laragon_base, ver);
                        if std::path::Path::new(&p).exists() { return Some(p); }
                    }
                }
            }
        }

        // 2. Fallback to common bases
        let common_bases = [
            format!("{}:\\xampp", drive),
            format!("{}:\\laragon\\bin", drive),
            format!("{}:\\wamp64\\bin", drive),
            format!("{}:\\wamp\\bin", drive),
        ];

        for base in common_bases {
            if !std::path::Path::new(&base).exists() {
                continue;
            }

            if service_type == "mysql" {
                // XAMPP style
                let xampp_paths = [
                    format!("{}\\mysql\\bin\\my.ini", base),
                    format!("{}\\mysql\\my.ini", base),
                    format!("{}\\mysql\\bin\\my.cnf", base),
                ];
                for p in xampp_paths {
                    if std::path::Path::new(&p).exists() {
                        return Some(p);
                    }
                }

                // Laragon/WAMP style (versioned)
                if base.contains("laragon") || base.contains("wamp") {
                    let mysql_base = format!("{}\\mysql", base);
                    let mariadb_base = format!("{}\\mariadb", base);
                    
                    for m_base in [mysql_base, mariadb_base] {
                        if let Ok(entries) = std::fs::read_dir(m_base) {
                            for entry in entries.flatten() {
                                let p1 = entry.path().join("my.ini");
                                let p2 = entry.path().join("bin").join("my.ini");
                                if p1.exists() { return Some(p1.to_string_lossy().to_string()); }
                                if p2.exists() { return Some(p2.to_string_lossy().to_string()); }
                            }
                        }
                    }
                }
            } else if service_type == "apache" {
                // XAMPP style
                let xampp_path = format!("{}\\apache\\conf\\httpd.conf", base);
                if std::path::Path::new(&xampp_path).exists() {
                    return Some(xampp_path);
                }

                // Laragon/WAMP style (versioned)
                if base.contains("laragon") || base.contains("wamp") {
                    let apache_base = format!("{}\\apache", base);
                    if let Ok(entries) = std::fs::read_dir(apache_base) {
                        for entry in entries.flatten() {
                            let p = entry.path().join("conf").join("httpd.conf");
                            if p.exists() { return Some(p.to_string_lossy().to_string()); }
                        }
                    }
                }
            }
        }
    }
    None
}

pub fn fix_port_conflict(
    service_type: &str,
    old_port: u16,
    new_port: u16,
) -> Result<String, String> {
    let config_path = find_config_file(service_type)
        .ok_or_else(|| format!("Could not find configuration file for {}.", service_type))?;

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    // Simple replacement of port patterns
    // e.g., "port = 3306" or "Listen 80"
    let old_port_str = old_port.to_string();
    let new_port_str = new_port.to_string();

    let new_content = content.replace(&old_port_str, &new_port_str);

    if new_content == content {
        return Err(format!(
            "Could not find port {} in {}",
            old_port, config_path
        ));
    }

    std::fs::write(&config_path, new_content)
        .map_err(|e| format!("Failed to write updated config: {}", e))?;

    Ok(format!(
        "Successfully updated {} port to {} in {}",
        service_type, new_port, config_path
    ))
}
