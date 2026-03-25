use tauri::{Manager, Runtime, State};
use crate::AppSettings;
use std::sync::atomic::Ordering;

#[tauri::command]
pub async fn close_splashscreen<R: Runtime>(
    app: tauri::AppHandle<R>,
    settings: State<'_, AppSettings>,
) -> Result<(), String> {
    // Close splashscreen
    if let Some(splashscreen) = app.get_webview_window("splash") {
        splashscreen.close().map_err(|e| e.to_string())?;
    }
    
    // Show main window only if not starting minimized
    if !settings.start_minimized.load(Ordering::Relaxed) {
        if let Some(main_window) = app.get_webview_window("main") {
            main_window.show().map_err(|e| e.to_string())?;
            main_window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn show_splashscreen<R: Runtime>(
    app: tauri::AppHandle<R>,
    settings: State<'_, AppSettings>,
) -> Result<(), String> {
    // Show splashscreen only if not starting minimized
    if !settings.start_minimized.load(Ordering::Relaxed) {
        if let Some(splash) = app.get_webview_window("splash") {
            splash.show().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}