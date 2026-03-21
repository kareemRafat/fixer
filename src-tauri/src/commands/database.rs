use crate::services::database::{self, DetectedService, DatabaseInfo};

#[tauri::command]
pub fn detect_services() -> Vec<DetectedService> {
    database::detect_services()
}

#[tauri::command]
pub fn list_databases(host: &str, port: u16, user: &str, password: &str) -> Result<Vec<DatabaseInfo>, String> {
    database::list_databases(host, port, user, password)
}
