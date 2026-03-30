use tauri::{command, AppHandle, Emitter};
use std::fs;
use std::sync::atomic::Ordering;
use crate::services::installer::{self, ProgressPayload, CANCEL_TOKEN};

#[command]
pub async fn cancel_install() {
    CANCEL_TOKEN.store(true, Ordering::Relaxed);
}

#[command]
pub async fn start_one_click_install(
    app: AppHandle,
    config_url: String,
) -> Result<(), String> {
    CANCEL_TOKEN.store(false, Ordering::Relaxed);
    
    // Use a temp directory for the installer and zips
    let temp_dir = std::env::temp_dir().join("dbguardx_installer");
    if !temp_dir.exists() {
        fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    }

    // 1. Fetch Config
    app.emit("install-status", "Fetching configuration...").unwrap_or(());
    let config = installer::fetch_config(&config_url).await?;

    let laragon_exe_path = temp_dir.join("laragon_installer.exe");
    let php_zip_path = temp_dir.join("php.zip");
    let pma_zip_path = temp_dir.join("phpmyadmin.zip");

    // Helper to check for cancel and cleanup
    let check_cancel = || {
        if CANCEL_TOKEN.load(Ordering::Relaxed) {
            fs::remove_file(&laragon_exe_path).ok();
            fs::remove_file(&php_zip_path).ok();
            fs::remove_file(&pma_zip_path).ok();
            return true;
        }
        false
    };

    // Cleanup before starting
    fs::remove_file(&laragon_exe_path).ok();
    fs::remove_file(&php_zip_path).ok();
    fs::remove_file(&pma_zip_path).ok();

    // 2. Download Laragon
    app.emit("install-status", "Downloading Laragon...").unwrap_or(());
    installer::download_file(&app, "laragon", &config.laragon.url, &laragon_exe_path).await.map_err(|e| {
        check_cancel();
        e
    })?;
    if check_cancel() { return Err("Cancelled".to_string()); }

    // 3. Run Laragon Installer (Interactive)
    app.emit("install-status", "Please complete the Laragon installation window...").unwrap_or(());
    installer::run_laragon_installer(&laragon_exe_path).map_err(|e| {
        check_cancel();
        e
    })?;
    fs::remove_file(&laragon_exe_path).ok(); 
    if check_cancel() { return Err("Cancelled".to_string()); }

    // 4. Detect Installation Path
    app.emit("install-status", "Detecting Laragon path...").unwrap_or(());
    let laragon_base = installer::detect_laragon_path()?;
    app.emit("install-status", format!("Laragon detected at: {}", laragon_base.display())).unwrap_or(());

    // 5. Download & Extract PHP
    let php_target = laragon_base.join(config.php.target_subfolder.as_deref().unwrap_or("bin/php/php-8.3"));
    
    app.emit("install-status", "Downloading PHP Engine...").unwrap_or(());
    installer::download_file(&app, "php", &config.php.url, &php_zip_path).await.map_err(|e| {
        check_cancel();
        e
    })?;
    if check_cancel() { return Err("Cancelled".to_string()); }
    
    app.emit("install-status", "Extracting PHP...").unwrap_or(());
    installer::extract_zip(&php_zip_path, &php_target).map_err(|e| {
        check_cancel();
        e
    })?;
    fs::remove_file(&php_zip_path).ok(); 
    if check_cancel() { return Err("Cancelled".to_string()); }

    // 6. Download & Extract phpMyAdmin
    let pma_target = laragon_base.join(config.phpmyadmin.target_subfolder.as_deref().unwrap_or("etc/apps/phpMyAdmin"));
    
    app.emit("install-status", "Downloading phpMyAdmin...").unwrap_or(());
    installer::download_file(&app, "phpmyadmin", &config.phpmyadmin.url, &pma_zip_path).await.map_err(|e| {
        check_cancel();
        e
    })?;
    if check_cancel() { return Err("Cancelled".to_string()); }
    
    app.emit("install-status", "Extracting phpMyAdmin...").unwrap_or(());
    installer::extract_zip(&pma_zip_path, &pma_target).map_err(|e| {
        check_cancel();
        e
    })?;
    fs::remove_file(&pma_zip_path).ok(); 
    if check_cancel() { return Err("Cancelled".to_string()); }

    // 7. Update laragon.ini
    app.emit("install-status", "Applying final configurations...").unwrap_or(());
    let php_folder_name = php_target.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("php-8.3");
    installer::update_laragon_ini(&laragon_base, php_folder_name)?;

    // 8. Update System PATH
    app.emit("install-status", "Updating Windows environment (PATH)...").unwrap_or(());
    let mut paths_to_add = vec![php_target];
    
    let mysql_base = laragon_base.join("bin/mysql");
    if mysql_base.exists() {
        if let Ok(entries) = fs::read_dir(mysql_base) {
            for entry in entries.flatten() {
                if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    let mysql_bin = entry.path().join("bin");
                    if mysql_bin.exists() {
                        paths_to_add.push(mysql_bin);
                        break;
                    }
                }
            }
        }
    }

    installer::update_path_env(paths_to_add)?;

    app.emit("install-status", "Setup Complete!").unwrap_or(());
    app.emit("install-progress", ProgressPayload {
        component: "total".to_string(),
        progress: 100,
        status: "Success".to_string(),
    }).unwrap_or(());

    // Final cleanup of temp dir
    fs::remove_dir_all(&temp_dir).ok();

    Ok(())
}
