use tauri::{Manager, Runtime};

#[tauri::command]
pub async fn close_splashscreen<R: Runtime>(app: tauri::AppHandle<R>) {
    // Close splashscreen
    if let Some(splashscreen) = app.get_webview_window("splash") {
        splashscreen.close().unwrap();
    }
    // Show main window
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.show().unwrap();
        main_window.set_focus().unwrap();
    }
}

#[tauri::command]
pub async fn show_splashscreen<R: Runtime>(app: tauri::AppHandle<R>) {
    // Show splashscreen
    if let Some(splash) = app.get_webview_window("splash") {
        splash.show().unwrap();
    }
}
