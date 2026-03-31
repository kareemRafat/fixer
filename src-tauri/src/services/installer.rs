use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;
use zip::ZipArchive;
use winreg::enums::*;
use winreg::RegKey;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use lazy_static::lazy_static;

lazy_static! {
    pub static ref CANCEL_TOKEN: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstallComponent {
    pub url: String,
    pub version: String,
    pub is_exe: Option<bool>,
    pub target_subfolder: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SetupConfig {
    pub laragon: InstallComponent,
    pub php: InstallComponent,
    pub phpmyadmin: InstallComponent,
}

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub component: String,
    pub progress: u8,
    pub status: String,
}

pub async fn fetch_config(url: &str) -> Result<SetupConfig, String> {
    let client = reqwest::Client::new();
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;
    let config = response.json::<SetupConfig>().await.map_err(|e| e.to_string())?;
    Ok(config)
}

pub async fn download_file(
    app: &AppHandle,
    component_name: &str,
    url: &str,
    dest_path: &Path,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    let total_size = res.content_length().unwrap_or(0);

    let mut file = File::create(dest_path).map_err(|e| e.to_string())?;
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();

    while let Some(item) = stream.next().await {
        if CANCEL_TOKEN.load(Ordering::Relaxed) {
            return Err("Cancelled".to_string());
        }
        let chunk = item.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let progress = (downloaded as f64 / total_size as f64 * 100.0) as u8;
            app.emit("install-progress", ProgressPayload {
                component: component_name.to_string(),
                progress,
                status: format!("Downloading {}...", component_name),
            }).unwrap_or(());
        }
    }

    Ok(())
}

pub fn run_laragon_installer(installer_path: &Path) -> Result<(), String> {
    // We don't use silent flags here to allow user interaction
    let mut child = Command::new(installer_path)
        .spawn()
        .map_err(|e| format!("Failed to start installer: {}", e))?;

    let status = child.wait().map_err(|e| format!("Failed to wait for installer: {}", e))?;

    if !status.success() {
        return Err("Installer exited with an error".to_string());
    }

    Ok(())
}

pub fn detect_laragon_path() -> Result<PathBuf, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    // Try HKCU first
    if let Ok(key) = hkcu.open_subkey("Software\\Laragon") {
        if let Ok(path_val) = key.get_value::<String, _>("") {
            if !path_val.is_empty() { return Ok(PathBuf::from(path_val)); }
        }
    }

    // Try HKLM (32-bit and 64-bit)
    let hklm_paths = vec![
        "SOFTWARE\\Laragon",
        "SOFTWARE\\WOW6432Node\\Laragon"
    ];

    for subkey in hklm_paths {
        if let Ok(key) = hklm.open_subkey(subkey) {
            if let Ok(path_val) = key.get_value::<String, _>("") {
                if !path_val.is_empty() { return Ok(PathBuf::from(path_val)); }
            }
        }
    }

    // Fallback search if registry fails
    let common_paths = vec!["C:\\laragon", "D:\\laragon", "E:\\laragon"];
    for p in common_paths {
        let path = PathBuf::from(p);
        if path.join("laragon.exe").exists() {
            return Ok(path);
        }
    }

    Err("Could not detect Laragon installation path. Please ensure Laragon is installed correctly.".to_string())
}

pub fn detect_xampp_path() -> Option<PathBuf> {
    let common_paths = vec!["C:\\xampp", "D:\\xampp", "E:\\xampp"];
    for p in common_paths {
        let path = PathBuf::from(p);
        if path.join("xampp-control.exe").exists() {
            return Some(path);
        }
    }
    None
}

pub fn detect_wamp_path() -> Option<PathBuf> {
    // Try Registry first
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey("SOFTWARE\\WampServer") {
        if let Ok(path_val) = key.get_value::<String, _>("InstallDir") {
            if !path_val.is_empty() { return Some(PathBuf::from(path_val)); }
        }
    }

    let common_paths = vec!["C:\\wamp64", "C:\\wamp", "D:\\wamp64", "D:\\wamp"];
    for p in common_paths {
        let path = PathBuf::from(p);
        if path.join("wampmanager.exe").exists() {
            return Some(path);
        }
    }
    None
}

pub fn extract_zip(zip_path: &Path, target_dir: &Path) -> Result<(), String> {
    let file = File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    if target_dir.exists() {
        fs::remove_dir_all(target_dir).ok();
    }
    fs::create_dir_all(target_dir).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        if CANCEL_TOKEN.load(Ordering::Relaxed) {
            return Err("Cancelled".to_string());
        }
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => target_dir.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    // Smart Flattening: If the target_dir contains ONLY one folder and no files, move everything up
    if let Ok(entries) = fs::read_dir(target_dir) {
        let entries: Vec<_> = entries.flatten().collect();
        if entries.len() == 1 && entries[0].file_type().map(|t| t.is_dir()).unwrap_or(false) {
            let subfolder = entries[0].path();
            if let Ok(sub_entries) = fs::read_dir(&subfolder) {
                for sub_entry in sub_entries.flatten() {
                    let from = sub_entry.path();
                    let to = target_dir.join(from.file_name().unwrap());
                    fs::rename(from, to).ok();
                }
                fs::remove_dir(subfolder).ok();
            }
        }
    }

    Ok(())
}

pub fn update_laragon_ini(laragon_path: &Path, php_folder_name: &str) -> Result<(), String> {
    let ini_path = laragon_path.join("usr/laragon.ini");
    if !ini_path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&ini_path).map_err(|e| e.to_string())?;
    
    let lines: Vec<String> = content.lines().map(|line| {
        if line.trim().starts_with("php_version=") {
            format!("php_version={}", php_folder_name)
        } else {
            line.to_string()
        }
    }).collect();

    fs::write(ini_path, lines.join("\n")).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_path_env(paths_to_add: Vec<PathBuf>) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (env, _) = hkcu.create_subkey("Environment").map_err(|e| e.to_string())?;
    
    let current_path: String = env.get_value("Path").unwrap_or_else(|_| "".to_string());
    let mut path_list: Vec<String> = current_path.split(';').map(|s| s.to_string()).collect();

    for p in paths_to_add {
        let p_str = p.to_str().unwrap_or("").to_string();
        if !p_str.is_empty() && !path_list.contains(&p_str) {
            path_list.push(p_str);
        }
    }

    let new_path = path_list.join(";");
    env.set_value("Path", &new_path).map_err(|e| e.to_string())?;

    // Broadcast WM_SETTINGCHANGE
    unsafe {
        use winapi::um::winuser::{SendMessageTimeoutA, HWND_BROADCAST, WM_SETTINGCHANGE, SMTO_ABORTIFHUNG};
        let param = b"Environment\0";
        SendMessageTimeoutA(
            HWND_BROADCAST,
            WM_SETTINGCHANGE,
            0,
            param.as_ptr() as isize,
            SMTO_ABORTIFHUNG,
            5000,
            std::ptr::null_mut(),
        );
    }

    Ok(())
}
