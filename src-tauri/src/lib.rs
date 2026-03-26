mod commands;
mod services;

use std::sync::atomic::{AtomicBool, Ordering};
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
            commands::splash::show_splashscreen
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
