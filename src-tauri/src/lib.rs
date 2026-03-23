mod commands;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                services::scheduler::scheduler_loop(app_handle).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping::ping,
            commands::database::detect_services,
            commands::database::list_databases,
            commands::database::run_backup,
            commands::database::get_file_size,
            commands::database::run_restore,
            commands::database::validate_backup_file,
            commands::database::compress_file,
            commands::database::run_raw_backup,
            commands::database::detect_xampp_data_path,
            commands::database::delete_file,
            commands::diagnostics::check_port_status,
            commands::diagnostics::kill_process,
            commands::diagnostics::fix_port_conflict,
            commands::splash::close_splashscreen
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
