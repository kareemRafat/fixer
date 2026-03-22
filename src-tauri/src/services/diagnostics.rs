use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct PortStatus {
    pub port: u16,
    pub is_in_use: bool,
    pub process_name: Option<String>,
    pub pid: Option<u32>,
}

pub fn check_port_usage(port: u16) -> PortStatus {
    // Run netstat -ano | findstr :PORT
    let output = Command::new("cmd")
        .args(["/C", &format!("netstat -ano | findstr :{}", port)])
        .output();

    if let Ok(output) = output {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Some(line) = stdout.lines().next() {
            // Typical line: TCP    0.0.0.0:3306           0.0.0.0:0              LISTENING       1234
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(pid_str) = parts.last() {
                if let Ok(pid) = pid_str.parse::<u32>() {
                    // Try to get process name from PID
                    let name_output = Command::new("tasklist")
                        .args(["/FI", &format!("PID eq {}", pid), "/NH", "/FO", "CSV"])
                        .output();

                    let mut process_name = None;
                    if let Ok(name_out) = name_output {
                        let name_stdout = String::from_utf8_lossy(&name_out.stdout);
                        // Typical output: "mysqld.exe","1234","Services","0","45,678 K"
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

    PortStatus {
        port,
        is_in_use: false,
        process_name: None,
        pid: None,
    }
}

pub fn kill_process(pid: u32) -> Result<(), String> {
    let output = Command::new("taskkill")
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
    let common_bases = [
        "C:\\xampp",
        "D:\\xampp",
        "C:\\laragon\\bin",
        "C:\\wamp64\\bin",
    ];

    for base in common_bases {
        if service_type == "mysql" {
            let paths = [
                format!("{}\\mysql\\bin\\my.ini", base),
                format!("{}\\mysql\\my.ini", base),
            ];
            for p in paths {
                if std::path::Path::new(&p).exists() {
                    return Some(p);
                }
            }
        } else if service_type == "apache" {
            let paths = [format!("{}\\apache\\conf\\httpd.conf", base)];
            for p in paths {
                if std::path::Path::new(&p).exists() {
                    return Some(p);
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
