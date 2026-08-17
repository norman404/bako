use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{Connection, SqliteConnection};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, Runtime};

use crate::print::usb_detection::detect_usb_printers;
use crate::print::{
    create_printer_driver, print_command_with_driver, print_ticket_with_driver,
    test_printer_with_driver, CommandItem, CommandPayload, LabelConfig, TicketItem, TicketPayload,
    TicketPayment,
};

const DATABASE_BACKUP_DIRECTORY: &str = "backups";
const MAX_DATABASE_SIZE_BYTES: u64 = 512 * 1024 * 1024;
const SQLITE_HEADER: &[u8; 16] = b"SQLite format 3\0";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintTicketInput {
    pub printer_type: String,
    pub printer_address: String,
    pub ticket_number: u32,
    pub created_at: String,
    pub total: u32,
    pub items: Vec<TicketItem>,
    pub payments: Vec<TicketPayment>,
}

#[tauri::command]
pub fn print_ticket(input: PrintTicketInput) -> Result<(), String> {
    log::info!(
        "print_ticket: type={}, address={}, items={}",
        input.printer_type,
        input.printer_address,
        input.items.len()
    );

    let driver =
        create_printer_driver(&input.printer_type, &input.printer_address).map_err(|e| {
            log::error!("print_ticket: failed to create driver: {}", e);
            e.to_string()
        })?;

    let payload = TicketPayload {
        ticket_number: input.ticket_number,
        created_at: input.created_at,
        total: input.total,
        items: input.items,
        payments: input.payments,
    };

    print_ticket_with_driver(driver, &payload).map_err(|e| {
        log::error!("print_ticket: failed to print: {}", e);
        e.to_string()
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintCommandInput {
    pub printer_type: String,
    pub printer_address: String,
    pub header_text: String,
    pub items: Vec<CommandItem>,
    pub label_width_mm: Option<u32>,
    pub label_height_mm: Option<u32>,
    pub label_gap_mm: Option<u32>,
    pub label_language: Option<String>,
}

#[tauri::command]
pub fn print_command(input: PrintCommandInput) -> Result<(), String> {
    log::info!(
        "print_command: type={}, address={}, items={}",
        input.printer_type,
        input.printer_address,
        input.items.len()
    );

    let driver =
        create_printer_driver(&input.printer_type, &input.printer_address).map_err(|e| {
            log::error!("print_command: failed to create driver: {}", e);
            e.to_string()
        })?;

    let payload = CommandPayload {
        header_text: input.header_text.clone(),
        items: input.items.clone(),
    };

    let label_config = (input.printer_type == "label").then_some(LabelConfig {
        width_mm: input
            .label_width_mm
            .unwrap_or(crate::print::DEFAULT_LABEL_WIDTH_MM),
        height_mm: input
            .label_height_mm
            .unwrap_or(crate::print::DEFAULT_LABEL_HEIGHT_MM),
        gap_mm: input
            .label_gap_mm
            .unwrap_or(crate::print::DEFAULT_LABEL_GAP_MM),
        label_language: input.label_language.clone(),
    });

    print_command_with_driver(driver, &input.printer_type, &payload, label_config).map_err(|e| {
        log::error!("print_command: failed to print: {}", e);
        e.to_string()
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestPrinterInput {
    pub printer_type: String,
    pub printer_address: String,
    pub label_width_mm: Option<u32>,
    pub label_height_mm: Option<u32>,
    pub label_gap_mm: Option<u32>,
    pub label_language: Option<String>,
}

#[tauri::command]
pub fn test_printer(input: TestPrinterInput) -> Result<(), String> {
    log::info!(
        "test_printer: type={}, address={}",
        input.printer_type,
        input.printer_address
    );

    let driver =
        create_printer_driver(&input.printer_type, &input.printer_address).map_err(|e| {
            log::error!("test_printer: failed to create driver: {}", e);
            e.to_string()
        })?;

    let label_config = (input.printer_type == "label").then_some(LabelConfig {
        width_mm: input
            .label_width_mm
            .unwrap_or(crate::print::DEFAULT_LABEL_WIDTH_MM),
        height_mm: input
            .label_height_mm
            .unwrap_or(crate::print::DEFAULT_LABEL_HEIGHT_MM),
        gap_mm: input
            .label_gap_mm
            .unwrap_or(crate::print::DEFAULT_LABEL_GAP_MM),
        label_language: input.label_language.clone(),
    });

    test_printer_with_driver(driver, &input.printer_type, label_config).map_err(|e| {
        log::error!("test_printer: failed to print: {}", e);
        e.to_string()
    })
}

#[tauri::command]
pub fn list_usb_printers() -> Result<Vec<crate::print::usb_detection::UsbPrinterInfo>, String> {
    let printers = detect_usb_printers();
    log::info!("list_usb_printers: detected {} printers", printers.len());
    for printer in &printers {
        log::debug!("list_usb_printers: {} ({})", printer.name, printer.address);
    }
    Ok(printers)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseInfo {
    pub path: String,
    pub exists: bool,
    pub size_bytes: Option<u64>,
}

fn database_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not resolve database directory: {error}"))?;
    path.push(crate::DATABASE_FILENAME);
    Ok(path)
}

fn now_millis() -> Result<u128, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .map_err(|error| format!("Could not create database backup name: {error}"))
}

fn remove_if_exists(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("Could not remove {}: {error}", path.display())),
    }
}

fn remove_database_sidecars(database: &Path) -> Result<(), String> {
    let wal = PathBuf::from(format!("{}-wal", database.display()));
    let shm = PathBuf::from(format!("{}-shm", database.display()));
    remove_if_exists(&wal)?;
    remove_if_exists(&shm)
}

fn ensure_database_source(source: &Path, current: &Path) -> Result<u64, String> {
    let metadata = fs::metadata(source)
        .map_err(|error| format!("Could not read selected database: {error}"))?;

    if !metadata.is_file() {
        return Err("The selected database is not a file".to_string());
    }

    if metadata.len() > MAX_DATABASE_SIZE_BYTES {
        return Err("The selected database is too large".to_string());
    }

    let source_canonical = fs::canonicalize(source)
        .map_err(|error| format!("Could not resolve selected database: {error}"))?;
    let current_canonical = fs::canonicalize(current).unwrap_or_else(|_| current.to_path_buf());
    if source_canonical == current_canonical {
        return Err("The selected file is the active Bako database".to_string());
    }

    let mut file = fs::File::open(source)
        .map_err(|error| format!("Could not open selected database: {error}"))?;
    let mut header = [0_u8; 16];
    file.read_exact(&mut header)
        .map_err(|error| format!("Could not read selected database header: {error}"))?;
    if &header != SQLITE_HEADER {
        return Err("The selected file is not a valid SQLite database".to_string());
    }

    Ok(metadata.len())
}

async fn open_sqlite(path: &Path, read_only: bool) -> Result<SqliteConnection, String> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false)
        .read_only(read_only);

    SqliteConnection::connect_with(&options)
        .await
        .map_err(|error| format!("Could not open SQLite database: {error}"))
}

async fn vacuum_into(source: &Path, destination: &Path) -> Result<(), String> {
    if destination.exists() {
        return Err("The destination file already exists".to_string());
    }

    let parent = destination
        .parent()
        .ok_or_else(|| "The destination has no parent directory".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Could not create backup directory: {error}"))?;

    let mut connection = open_sqlite(source, false).await?;
    let destination_string = destination.to_string_lossy().to_string();
    let snapshot_result = sqlx::query("VACUUM INTO ?")
        .bind(destination_string)
        .execute(&mut connection)
        .await
        .map(|_| ())
        .map_err(|error| format!("Could not create consistent SQLite snapshot: {error}"));
    let close_result = connection
        .close()
        .await
        .map_err(|error| format!("Could not close SQLite snapshot connection: {error}"));

    if snapshot_result.is_err() || close_result.is_err() {
        let _ = remove_if_exists(destination);
    }

    match (snapshot_result, close_result) {
        (Err(error), _) => Err(error),
        (Ok(()), Err(error)) => Err(error),
        (Ok(()), Ok(())) => Ok(()),
    }
}

async fn validate_bako_database(path: &Path) -> Result<(), String> {
    let mut connection = open_sqlite(path, true).await?;
    let integrity: String = sqlx::query_scalar("PRAGMA integrity_check")
        .fetch_one(&mut connection)
        .await
        .map_err(|error| format!("Could not check database integrity: {error}"))?;

    if integrity != "ok" {
        return Err(format!("Database integrity check failed: {integrity}"));
    }

    let migrations_table: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
    )
    .fetch_one(&mut connection)
    .await
    .map_err(|error| format!("Could not inspect database migrations: {error}"))?;

    if migrations_table != 1 {
        return Err("The selected database is not a Bako database".to_string());
    }

    let latest_migration: Option<i64> =
        sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations WHERE success = 1")
            .fetch_one(&mut connection)
            .await
            .map_err(|error| format!("Could not inspect database version: {error}"))?;

    let latest_migration = latest_migration
        .ok_or_else(|| "The selected database is not a Bako database".to_string())?;
    if latest_migration > crate::CURRENT_MIGRATION_VERSION {
        return Err("The selected database belongs to a newer Bako version".to_string());
    }

    connection
        .close()
        .await
        .map_err(|error| format!("Could not close database validation connection: {error}"))?;
    Ok(())
}

#[tauri::command]
pub async fn validate_database<R: Runtime>(
    app: AppHandle<R>,
    source: String,
) -> Result<(), String> {
    let current = database_path(&app)?;
    let source = PathBuf::from(source);
    ensure_database_source(&source, &current)?;
    validate_bako_database(&source).await
}

#[tauri::command]
pub async fn get_database_info<R: Runtime>(app: AppHandle<R>) -> Result<DatabaseInfo, String> {
    let path = database_path(&app)?;
    let metadata = fs::metadata(&path).ok();

    Ok(DatabaseInfo {
        path: path.to_string_lossy().to_string(),
        exists: metadata.is_some(),
        size_bytes: metadata.map(|value| value.len()),
    })
}

#[tauri::command]
pub async fn export_database<R: Runtime>(
    app: AppHandle<R>,
    destination: String,
) -> Result<(), String> {
    let source = database_path(&app)?;
    let destination = PathBuf::from(destination);
    ensure_database_source(&source, &destination)?;
    vacuum_into(&source, &destination).await
}

#[tauri::command]
pub async fn prepare_database_restore<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let source = database_path(&app)?;
    let mut backup_directory = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not resolve backup directory: {error}"))?;
    backup_directory.push(DATABASE_BACKUP_DIRECTORY);
    fs::create_dir_all(&backup_directory)
        .map_err(|error| format!("Could not create safety backup directory: {error}"))?;

    let backup_name = format!("pre-restore-{}.sqlite", now_millis()?);
    let backup_path = backup_directory.join(backup_name);
    vacuum_into(&source, &backup_path).await?;
    if let Err(error) = validate_bako_database(&backup_path).await {
        let _ = remove_if_exists(&backup_path);
        return Err(format!("Could not verify safety backup: {error}"));
    }

    let mut backups: Vec<PathBuf> = fs::read_dir(&backup_directory)
        .map_err(|error| format!("Could not list safety backups: {error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with("pre-restore-") && name.ends_with(".sqlite"))
        })
        .collect();
    backups.sort();
    while backups.len() > 3 {
        let old_backup = backups.remove(0);
        remove_if_exists(&old_backup)?;
    }

    Ok(())
}

fn replace_database_file(staged: &Path, current: &Path, timestamp: u128) -> Result<(), String> {
    let rollback =
        current.with_file_name(format!("{}.rollback-{timestamp}", crate::DATABASE_FILENAME));
    if current.exists() {
        fs::rename(current, &rollback).map_err(|error| {
            let _ = remove_if_exists(staged);
            format!("Could not prepare current database for replacement: {error}")
        })?;
    }

    if let Err(error) = remove_database_sidecars(current) {
        let _ = remove_if_exists(staged);
        if rollback.exists() {
            let _ = fs::rename(&rollback, current);
        }
        return Err(error);
    }

    if let Err(error) = fs::rename(staged, current) {
        let _ = remove_if_exists(staged);
        if rollback.exists() {
            let _ = fs::rename(&rollback, current);
        }
        return Err(format!("Could not replace current database: {error}"));
    }

    let _ = remove_if_exists(&rollback);
    Ok(())
}

#[tauri::command]
pub async fn restore_database<R: Runtime>(app: AppHandle<R>, source: String) -> Result<(), String> {
    let current = database_path(&app)?;
    let source = PathBuf::from(source);
    ensure_database_source(&source, &current)?;
    validate_bako_database(&source).await?;

    let timestamp = now_millis()?;
    let staged = current.with_file_name(format!(
        "{}.restore-{timestamp}.tmp",
        crate::DATABASE_FILENAME
    ));
    fs::copy(&source, &staged)
        .map_err(|error| format!("Could not stage selected database: {error}"))?;
    if let Err(error) =
        crate::database_migrations::repair_partial_label_orientation_migration(&staged).await
    {
        let _ = remove_if_exists(&staged);
        return Err(error);
    }
    if let Err(error) = validate_bako_database(&staged).await {
        let _ = remove_if_exists(&staged);
        return Err(error);
    }

    replace_database_file(&staged, &current, timestamp)
}

#[cfg(test)]
mod database_tests {
    use super::{
        ensure_database_source, remove_database_sidecars, replace_database_file, vacuum_into,
        validate_bako_database, SQLITE_HEADER,
    };
    use sqlx::sqlite::SqliteConnectOptions;
    use sqlx::{Connection, Executor, SqliteConnection};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_database_path() -> std::path::PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("bako-database-test-{suffix}.db"))
    }

    #[test]
    fn creates_a_consistent_snapshot_with_seed_data() {
        // CASE: a live SQLite database contains committed data.
        // VALIDATES: VACUUM INTO creates a readable backup with the same row.
        let source = temporary_database_path();
        let destination = source.with_extension("backup.sqlite");
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&source)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("source database");
            connection
                .execute("CREATE TABLE backup_seed (value TEXT NOT NULL)")
                .await
                .expect("seed table");
            connection
                .execute("INSERT INTO backup_seed (value) VALUES ('snapshot-ok')")
                .await
                .expect("seed row");
            connection.close().await.expect("close source database");

            vacuum_into(&source, &destination)
                .await
                .expect("create snapshot");

            let backup_options = SqliteConnectOptions::new()
                .filename(&destination)
                .read_only(true);
            let mut backup = SqliteConnection::connect_with(&backup_options)
                .await
                .expect("backup database");
            let value: String = sqlx::query_scalar("SELECT value FROM backup_seed")
                .fetch_one(&mut backup)
                .await
                .expect("backup row");
            backup.close().await.expect("close backup database");
            assert_eq!(value, "snapshot-ok");
        });

        let _ = fs::remove_file(source);
        let _ = fs::remove_file(destination);
    }

    #[test]
    fn rejects_a_file_without_the_sqlite_header() {
        // CASE: an operator selects a random file as a database backup.
        // VALIDATES: the import rejects it before opening or replacing anything.
        let selected = temporary_database_path();
        fs::write(&selected, b"not a valid sqlite").expect("selected file");

        let result = ensure_database_source(&selected, &selected.with_extension("current"));

        assert!(result
            .expect_err("invalid header should be rejected")
            .contains("not a valid SQLite database"));
        let _ = fs::remove_file(selected);
    }

    #[test]
    fn rejects_a_valid_sqlite_file_without_bako_migrations() {
        // CASE: an operator selects a valid SQLite database from another application.
        // VALIDATES: import requires Bako migration metadata, not just a SQLite header.
        let selected = temporary_database_path();
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&selected)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            connection
                .execute("CREATE TABLE other_app (id INTEGER)")
                .await
                .expect("other app table");
            connection.close().await.expect("close sqlite database");
        });

        let error = tauri::async_runtime::block_on(validate_bako_database(&selected))
            .expect_err("non-Bako database should be rejected");

        assert!(error.contains("not a Bako database"));
        let _ = fs::remove_file(selected);
    }

    #[test]
    fn rejects_a_database_from_a_newer_bako_version() {
        // CASE: a valid SQLite file advertises a migration newer than this build.
        // VALIDATES: importing a future database is rejected before replacement.
        let selected = temporary_database_path();
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&selected)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            connection
                .execute("CREATE TABLE _sqlx_migrations (version INTEGER, success BOOLEAN)")
                .await
                .expect("migration table");
            connection
                .execute("INSERT INTO _sqlx_migrations (version, success) VALUES (29, 1)")
                .await
                .expect("future migration");
            connection.close().await.expect("close sqlite database");
        });

        let error = tauri::async_runtime::block_on(validate_bako_database(&selected))
            .expect_err("future database should be rejected");

        assert!(error.contains("newer Bako version"));
        let _ = fs::remove_file(selected);
    }

    #[test]
    fn rejects_a_malformed_migration_table() {
        // CASE: a file spoofs the migration table but has an incompatible shape.
        // VALIDATES: validation fails closed instead of accepting malformed metadata.
        let selected = temporary_database_path();
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&selected)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            connection
                .execute("CREATE TABLE _sqlx_migrations (version INTEGER)")
                .await
                .expect("malformed migration table");
            connection.close().await.expect("close sqlite database");
        });

        let error = tauri::async_runtime::block_on(validate_bako_database(&selected))
            .expect_err("malformed migration table should be rejected");

        assert!(error.contains("Could not inspect database version"));
        let _ = fs::remove_file(selected);
    }

    #[test]
    fn preserves_the_current_database_when_staging_replacement_fails() {
        // CASE: the staged replacement disappears before the atomic rename.
        // VALIDATES: the original database is restored from the rollback file.
        let current = temporary_database_path();
        let staged = current.with_file_name("missing-bako-restore.tmp");
        fs::write(&current, b"current database").expect("current database");

        let error = replace_database_file(&staged, &current, 123)
            .expect_err("missing staged database should fail");

        assert!(error.contains("Could not replace current database"));
        assert_eq!(
            fs::read(&current).expect("restored current database"),
            b"current database"
        );
        let _ = fs::remove_file(current);
    }

    #[test]
    fn removes_sqlite_wal_and_shm_sidecars() {
        // CASE: an SQLite database has active WAL sidecar files.
        // VALIDATES: replacing the database removes stale sidecars.
        let database = temporary_database_path();
        let wal = std::path::PathBuf::from(format!("{}-wal", database.display()));
        let shm = std::path::PathBuf::from(format!("{}-shm", database.display()));
        fs::write(&database, SQLITE_HEADER).expect("database");
        fs::write(&wal, b"wal").expect("wal");
        fs::write(&shm, b"shm").expect("shm");

        remove_database_sidecars(&database).expect("remove sidecars");

        assert!(!wal.exists());
        assert!(!shm.exists());
        let _ = fs::remove_file(database);
    }
}
