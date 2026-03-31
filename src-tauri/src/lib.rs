mod commands;
mod services;

use std::sync::atomic::{AtomicBool, Ordering};
use sqlx::{Row, sqlite::SqlitePool};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, State,
};

struct AppSettings {
    minimize_to_tray: AtomicBool,
    start_minimized: AtomicBool,
    was_started_minimized: AtomicBool,
}

#[tauri::command]
fn update_minimize_to_tray(state: State<'_, AppSettings>, enabled: bool) {
    state.minimize_to_tray.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn update_start_minimized(state: State<'_, AppSettings>, enabled: bool) {
    state.start_minimized.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn was_started_minimized(state: State<'_, AppSettings>) -> bool {
    state.was_started_minimized.load(Ordering::Relaxed)
}

#[tauri::command]
async fn apply_window_size(app_handle: tauri::AppHandle, mode: String) {
    if let Some(main_window) = app_handle.get_webview_window("main") {
        match mode.as_str() {
            "maximized" => {
                let _ = main_window.maximize();
            }
            "fixed" => {
                let _ = main_window.unmaximize();
                let _ = main_window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                    width: 1024.0,
                    height: 768.0,
                }));
                let _ = main_window.center();
            }
            _ => { // "suitable" or default
                let _ = main_window.unmaximize();
                if let Ok(Some(monitor)) = main_window.primary_monitor() {
                    let size = monitor.size();
                    let scale_factor = monitor.scale_factor();
                    
                    let logical_width = size.width as f64 / scale_factor;
                    let logical_height = size.height as f64 / scale_factor;
                    
                    let mut target_width = logical_width * 0.85;
                    let mut target_height = logical_height * 0.85;
                    
                    if target_width > 1280.0 { target_width = 1280.0; }
                    if target_width < 1024.0 { target_width = 1024.0; }
                    
                    if target_height > 850.0 { target_height = 850.0; }
                    if target_height < 720.0 { target_height = 720.0; }

                    let _ = main_window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                        width: target_width,
                        height: target_height,
                    }));
                    let _ = main_window.center();
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let started_with_flag = std::env::args().any(|arg| arg == "--minimized");

    tauri::Builder::default()
        .manage(AppSettings {
            minimize_to_tray: AtomicBool::new(true),
            start_minimized: AtomicBool::new(false),
            was_started_minimized: AtomicBool::new(started_with_flag),
        })
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            // Dynamically set window size based on monitor and user settings
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                if let Some(main_window) = app_handle.get_webview_window("main") {
                    // Try to get user preference from DB
                    let mut mode = String::from("suitable");
                    let db_path = app_handle.path().app_data_dir().expect("Failed to get app data dir").join("backups.db");
                    if db_path.exists() {
                        let db_url = format!("sqlite:{}", db_path.to_string_lossy());
                        if let Ok(pool) = SqlitePool::connect(&db_url).await {
                            if let Ok(row) = sqlx::query("SELECT value FROM settings WHERE key = 'window_size_mode'")
                                .fetch_one(&pool).await {
                                    if let Ok(val) = row.try_get::<String, _>("value") {
                                        mode = val;
                                    }
                                }
                        }
                    }

                    match mode.as_str() {
                        "maximized" => {
                            let _ = main_window.maximize();
                        }
                        "fixed" => {
                            let _ = main_window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                                width: 1024.0,
                                height: 768.0,
                            }));
                            let _ = main_window.center();
                        }
                        _ => { // "suitable" or default
                            if let Ok(Some(monitor)) = main_window.primary_monitor() {
                                let size = monitor.size();
                                let scale_factor = monitor.scale_factor();
                                
                                let logical_width = size.width as f64 / scale_factor;
                                let logical_height = size.height as f64 / scale_factor;
                                
                                let mut target_width = logical_width * 0.85;
                                let mut target_height = logical_height * 0.85;
                                
                                if target_width > 1280.0 { target_width = 1280.0; }
                                if target_width < 1024.0 { target_width = 1024.0; }
                                
                                if target_height > 850.0 { target_height = 850.0; }
                                if target_height < 720.0 { target_height = 720.0; }

                                let _ = main_window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                                    width: target_width,
                                    height: target_height,
                                }));
                                let _ = main_window.center();
                            }
                        }
                    }
                }
            });

            // Create Menu Items
            let status_i = MenuItem::with_id(app, "status", "● Scheduler: Running", false, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Exit DBGuardX", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show DBGuardX", true, None::<&str>)?;

            // Build the Menu
            let menu = Menu::with_items(app, &[&status_i, &show_i, &quit_i])?;

            // Build the Tray Icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("DBGuardX")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.unminimize();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    match event {
                        TrayIconEvent::Click {
                            button: tauri::tray::MouseButton::Left,
                            ..
                        } => {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.unminimize();
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                services::scheduler::scheduler_loop(app_handle).await;
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppSettings>();
                if state.minimize_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    window.hide().unwrap();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            update_minimize_to_tray,
            update_start_minimized,
            was_started_minimized,
            commands::ping::ping,
            commands::database::detect_services,
            commands::database::list_databases,
            commands::database::list_tables,
            commands::database::run_backup,
            commands::database::get_file_size,
            commands::database::run_restore,
            commands::database::validate_backup_file,
            commands::database::compress_file,
            commands::database::run_raw_backup,
            commands::database::verify_backup,
            commands::database::detect_xampp_data_path,
            commands::database::delete_file,
            commands::diagnostics::check_port_status,
            commands::diagnostics::kill_process,
            commands::diagnostics::fix_port_conflict,
            commands::splash::close_splashscreen,
            commands::splash::show_splashscreen,
            commands::installer::start_one_click_install,
            commands::installer::is_laragon_installed,
            commands::installer::get_detected_environments,
            commands::installer::cancel_install,
            apply_window_size
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
