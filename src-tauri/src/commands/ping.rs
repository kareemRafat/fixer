#[tauri::command]
pub fn ping() -> String {
    "Pong!".to_string()
}
