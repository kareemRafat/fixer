use crate::services::diagnostics::{self, PortStatus};

#[tauri::command]
pub fn check_port_status(port: u16) -> PortStatus {
    diagnostics::check_port_usage(port)
}

#[tauri::command]
pub fn kill_process(pid: u32) -> Result<(), String> {
    diagnostics::kill_process(pid)
}

#[tauri::command]
pub fn fix_port_conflict(
    service_type: String,
    old_port: u16,
    new_port: u16,
) -> Result<String, String> {
    diagnostics::fix_port_conflict(&service_type, old_port, new_port)
}
