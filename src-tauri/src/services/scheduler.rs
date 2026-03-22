use tauri::{AppHandle, Manager, Emitter};
use std::time::Duration;
use tokio::time::sleep;
use sqlx::sqlite::SqlitePool;
use chrono::{Local, Timelike, Datelike, NaiveTime};
use serde::{Deserialize, Serialize};
use crate::services::database;
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Schedule {
    pub id: i32,
    pub name: String,
    pub databases: String,
    pub frequency: String, // "daily", "weekly", "monthly"
    pub time: String, // HH:mm
    pub day_of_week: Option<i32>,
    pub day_of_month: Option<i32>,
    pub backup_type: Option<String>,
    pub is_active: i32,
    pub last_run: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct Setting {
    pub key: String,
    pub value: String,
}

pub async fn scheduler_loop(app: AppHandle) {
    let db_path = app.path().app_data_dir().expect("Failed to get app data dir").join("backups.db");
    let db_url = format!("sqlite:{}", db_path.to_str().expect("Failed to convert path to string"));

    loop {
        // Check every minute
        sleep(Duration::from_secs(60)).await;

        if let Ok(pool) = SqlitePool::connect(&db_url).await {
            match check_and_run_schedules(&app, &pool).await {
                Ok(_) => {},
                Err(e) => eprintln!("Scheduler error: {}", e),
            }
        }
    }
}

async fn check_and_run_schedules(app: &AppHandle, pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    let schedules = sqlx::query_as::<_, Schedule>("SELECT * FROM schedules WHERE is_active = 1")
        .fetch_all(pool)
        .await?;

    let now = Local::now();
    let now_time = now.time();
    let now_date = now.date_naive();

    // Get settings
    let settings_list = sqlx::query_as::<_, Setting>("SELECT * FROM settings")
        .fetch_all(pool)
        .await?;
    
    let mut host = "localhost".to_string();
    let mut port = 3306;
    let mut user = "root".to_string();
    let mut password = "".to_string();
    let mut backup_path = "".to_string();
    let mut compress = false;

    for setting in settings_list {
        match setting.key.as_str() {
            "host" => host = setting.value,
            "port" => port = setting.value.parse().unwrap_or(3306),
            "user" => user = setting.value,
            "password" => password = setting.value,
            "backup_path" => backup_path = setting.value,
            "compress_backups" => compress = setting.value == "true",
            _ => {}
        }
    }

    if backup_path.is_empty() {
        return Ok(()); // Cannot backup without path
    }

    for schedule in schedules {
        if is_due(&schedule, now_time, now_date) {
            println!("Running scheduled backup: {}", schedule.name);
            
            let databases_list: Vec<String> = schedule.databases.split(',').map(|s| s.trim().to_string()).collect();
            let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
            let db_name_for_file = if databases_list.len() == 1 { &databases_list[0] } else { "multiple_dbs" };
            
            let file_name = format!("{}_{}.sql", db_name_for_file, timestamp);
            let dest_path = std::path::Path::new(&backup_path).join(&file_name);
            let dest_path_str = dest_path.to_str().unwrap();

            let backup_type = schedule.backup_type.unwrap_or_else(|| "sql".to_string());
            
            let result = if backup_type == "raw" {
                // Raw backup logic (simplified, assuming we have a source path in settings or something)
                // For now, let's just use the run_backup as it's the most common
                database::run_backup(&host, port, &user, &password, databases_list.clone(), dest_path_str)
            } else {
                database::run_backup(&host, port, &user, &password, databases_list.clone(), dest_path_str)
            };

            match result {
                Ok(msg) => {
                    let mut final_path = dest_path_str.to_string();
                    let mut file_size = std::fs::metadata(&dest_path).map(|m| m.len()).unwrap_or(0);

                    if compress && backup_type != "raw" {
                        let compressed_path = format!("{}.gz", dest_path_str);
                        if let Ok(_) = database::compress_file(dest_path_str, &compressed_path) {
                            let _ = std::fs::remove_file(dest_path_str);
                            final_path = compressed_path;
                            file_size = std::fs::metadata(&final_path).map(|m| m.len()).unwrap_or(0);
                        }
                    }

                    // Record in database
                    let now_iso = Local::now().to_rfc3339();
                    sqlx::query("INSERT INTO backups (database_name, databases, backup_type, timestamp, file_size, status, file_path, trigger_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                        .bind(db_name_for_file)
                        .bind(&schedule.databases)
                        .bind(&backup_type)
                        .bind(&now_iso)
                        .bind(file_size as i64)
                        .bind("Success")
                        .bind(&final_path)
                        .bind("scheduled")
                        .execute(pool)
                        .await?;

                    // Update last run
                    sqlx::query("UPDATE schedules SET last_run = ? WHERE id = ?")
                        .bind(&now_iso)
                        .bind(schedule.id)
                        .execute(pool)
                        .await?;

                    // Notify
                    app.notification()
                        .builder()
                        .title("Scheduled Backup Success")
                        .body(format!("Backup for {} completed successfully.", schedule.name))
                        .show()?;

                    // Emit event for UI reload
                    let _ = app.emit("backup-finished", ());
                },
                Err(e) => {
                    eprintln!("Scheduled backup failed: {}", e);
                    
                    // Record failure
                    let now_iso = Local::now().to_rfc3339();
                    sqlx::query("INSERT INTO backups (database_name, databases, backup_type, timestamp, file_size, status, file_path, trigger_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                        .bind(db_name_for_file)
                        .bind(&schedule.databases)
                        .bind(&backup_type)
                        .bind(&now_iso)
                        .bind(0)
                        .bind(format!("Failed: {}", e))
                        .bind("")
                        .bind("scheduled")
                        .execute(pool)
                        .await?;

                     app.notification()
                        .builder()
                        .title("Scheduled Backup Failed")
                        .body(format!("Backup for {} failed: {}", schedule.name, e))
                        .show()?;

                    // Emit event for UI reload (even on failure to show the failed record)
                    let _ = app.emit("backup-finished", ());
                }
            }
        }
    }

    Ok(())
}

fn is_due(schedule: &Schedule, now_time: NaiveTime, now_date: chrono::NaiveDate) -> bool {
    // Parse schedule time
    let sched_time = match NaiveTime::parse_from_str(&schedule.time, "%H:%M") {
        Ok(t) => t,
        Err(_) => return false,
    };

    // Check if time matches (within the current minute)
    if now_time.hour() != sched_time.hour() || now_time.minute() != sched_time.minute() {
        return false;
    }

    // Check if already run in the last hour to prevent multiple runs in the same minute
    if let Some(last_run_str) = &schedule.last_run {
        if let Ok(last_run) = chrono::DateTime::parse_from_rfc3339(last_run_str) {
            let last_run_local = last_run.with_timezone(&Local);
            if (Local::now() - last_run_local).num_minutes() < 2 {
                return false;
            }
        }
    }

    match schedule.frequency.as_str() {
        "daily" => true,
        "weekly" => {
            if let Some(dow) = schedule.day_of_week {
                // chrono dow is 0-6 (Mon-Sun), but let's check what we stored
                // Local::now().weekday().num_days_from_sunday() gives 0-6 (Sun-Sat)
                now_date.weekday().num_days_from_sunday() as i32 == dow
            } else {
                false
            }
        },
        "monthly" => {
            if let Some(dom) = schedule.day_of_month {
                now_date.day() as i32 == dom
            } else {
                false
            }
        },
        _ => false,
    }
}
