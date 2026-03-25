use crate::services::database::{self, DatabaseInfo, DetectedService};

#[tauri::command]
pub fn detect_services() -> Vec<DetectedService> {
    database::detect_services()
}

#[tauri::command]
pub fn list_databases(
    host: &str,
    port: u16,
    user: &str,
    password: &str,
) -> Result<Vec<DatabaseInfo>, String> {
    database::list_databases(host, port, user, password)
}

#[tauri::command]
pub async fn run_backup(
    host: String,
    port: u16,
    user: String,
    password: String,
    databases: Vec<String>,
    dest_path: String,
) -> Result<String, String> {
    // Run in a separate thread to avoid blocking the main thread
    tokio::task::spawn_blocking(move || {
        database::run_backup(&host, port, &user, &password, databases, &dest_path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn run_restore(
    host: String,
    port: u16,
    user: String,
    password: String,
    db_name: String,
    file_path: String,
    mysql_data_path: String,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        database::run_restore(
            &host,
            port,
            &user,
            &password,
            &db_name,
            &file_path,
            &mysql_data_path,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn validate_backup_file(file_path: String) -> Result<bool, String> {
    database::validate_backup_file(&file_path)
}

#[tauri::command]
pub async fn compress_file(source_path: String, dest_path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || database::compress_file(&source_path, &dest_path))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn run_raw_backup(source_dir: String, dest_dir: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || database::run_raw_backup(&source_dir, &dest_dir))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn verify_backup(
    host: String,
    port: u16,
    user: String,
    password: String,
    file_path: String,
) -> Result<database::VerificationResult, String> {
    tokio::task::spawn_blocking(move || {
        database::verify_backup(&host, port, &user, &password, &file_path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn detect_xampp_data_path() -> Option<String> {
    database::detect_xampp_data_path()
}
