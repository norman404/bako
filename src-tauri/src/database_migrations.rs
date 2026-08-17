use sqlx::migrate::{Migration, MigrationType};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{Connection, SqlStr, SqliteConnection};
use std::borrow::Cow;
use std::path::{Path, PathBuf};
use tauri::{Manager, Runtime};

pub const LABEL_ORIENTATION_MIGRATION_VERSION: i64 = 27;
const LABEL_ORIENTATION_MIGRATION_DESCRIPTION: &str = "printer_label_orientation";
const LABEL_ORIENTATION_MIGRATION_SQL: &str =
    include_str!("../migrations/0027_printer_label_orientation.sql");

fn migration_checksum() -> Vec<u8> {
    Migration::new(
        LABEL_ORIENTATION_MIGRATION_VERSION,
        Cow::Borrowed(LABEL_ORIENTATION_MIGRATION_DESCRIPTION),
        MigrationType::ReversibleUp,
        SqlStr::from_static(LABEL_ORIENTATION_MIGRATION_SQL),
        false,
    )
    .checksum
    .into_owned()
}

async fn open_database(path: &Path) -> Result<SqliteConnection, String> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false);
    SqliteConnection::connect_with(&options)
        .await
        .map_err(|error| {
            format!("Could not open database for migration compatibility repair: {error}")
        })
}

pub async fn repair_partial_label_orientation_migration(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    let mut connection = open_database(path).await?;
    let migrations_table_exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
    )
    .fetch_one(&mut connection)
    .await
    .map_err(|error| format!("Could not inspect migration history: {error}"))?;

    if migrations_table_exists == 0 {
        connection
            .close()
            .await
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    let has_label_orientation: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('printers') WHERE name = 'label_orientation'",
    )
    .fetch_one(&mut connection)
    .await
    .map_err(|error| format!("Could not inspect printer schema: {error}"))?;

    let applied: Option<(bool, Vec<u8>)> =
        sqlx::query_as("SELECT success, checksum FROM _sqlx_migrations WHERE version = ?")
            .bind(LABEL_ORIENTATION_MIGRATION_VERSION)
            .fetch_optional(&mut connection)
            .await
            .map_err(|error| format!("Could not inspect migration 27: {error}"))?;

    let expected_checksum = migration_checksum();
    match (has_label_orientation == 1, applied) {
        (true, None) => {
            sqlx::query(
                "INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time) VALUES (?, ?, TRUE, ?, -1)",
            )
            .bind(LABEL_ORIENTATION_MIGRATION_VERSION)
            .bind(LABEL_ORIENTATION_MIGRATION_DESCRIPTION)
            .bind(expected_checksum)
            .execute(&mut connection)
            .await
            .map_err(|error| format!("Could not record repaired migration 27: {error}"))?;
        }
        (true, Some((false, _))) | (false, Some((false, _))) => {
            return Err("Migration 27 is marked as failed".to_string());
        }
        (true, Some((true, checksum))) if checksum.as_slice() != expected_checksum.as_slice() => {
            return Err("Migration 27 has an unexpected checksum".to_string());
        }
        (true, Some((true, _))) => {}
        (false, None) => {}
        (false, Some((true, checksum))) if checksum.as_slice() != expected_checksum.as_slice() => {
            return Err("Migration 27 has an unexpected checksum".to_string());
        }
        (false, Some((true, _))) => {
            sqlx::query("DELETE FROM _sqlx_migrations WHERE version = ?")
                .bind(LABEL_ORIENTATION_MIGRATION_VERSION)
                .execute(&mut connection)
                .await
                .map_err(|error| format!("Could not repair migration 27 history: {error}"))?;
        }
    }

    connection
        .close()
        .await
        .map_err(|error| format!("Could not close migration compatibility connection: {error}"))?;
    Ok(())
}

pub fn init<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("database-migrations")
        .setup(|app, _api| {
            let mut path = app
                .path()
                .app_config_dir()
                .map_err(|error| format!("Could not resolve database directory: {error}"))?;
            path.push(PathBuf::from(crate::DATABASE_FILENAME));

            if let Err(error) =
                tauri::async_runtime::block_on(repair_partial_label_orientation_migration(&path))
            {
                log::error!("Database migration compatibility repair failed: {error}");
                return Err(Box::new(std::io::Error::other(error)));
            }
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::{
        migration_checksum, repair_partial_label_orientation_migration,
        LABEL_ORIENTATION_MIGRATION_VERSION,
    };
    use sqlx::sqlite::SqliteConnectOptions;
    use sqlx::{Connection, Executor, SqliteConnection};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEMPORARY_DATABASE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    fn temporary_database_path() -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        let sequence = TEMPORARY_DATABASE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let process_id = std::process::id();
        std::env::temp_dir().join(format!(
            "bako-migration-test-{process_id}-{suffix}-{sequence}.db"
        ))
    }

    async fn seed_migration_state(path: &Path, success: bool, checksum: Vec<u8>) {
        let options = SqliteConnectOptions::new()
            .filename(path)
            .create_if_missing(true);
        let mut connection = SqliteConnection::connect_with(&options)
            .await
            .expect("sqlite database");
        connection
            .execute("CREATE TABLE _sqlx_migrations (version INTEGER PRIMARY KEY, description TEXT NOT NULL, installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, success BOOLEAN NOT NULL, checksum BLOB NOT NULL, execution_time BIGINT NOT NULL)")
            .await
            .expect("migration table");
        sqlx::query("INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time) VALUES (27, 'printer_label_orientation', ?, ?, -1)")
            .bind(success)
            .bind(checksum)
            .execute(&mut connection)
            .await
            .expect("migration state");
        connection
            .execute("CREATE TABLE printers (label_orientation TEXT)")
            .await
            .expect("printers table");
        connection.close().await.expect("close sqlite database");
    }

    #[test]
    fn uses_the_same_checksum_as_the_embedded_sqlx_migrator() {
        // CASE: migration 27 is registered in the normal SQLx migrator.
        // VALIDATES: compatibility repair writes the exact checksum SQLx expects.
        let migrator = sqlx::migrate!("./migrations");
        let migration = migrator
            .iter()
            .find(|migration| migration.version == LABEL_ORIENTATION_MIGRATION_VERSION)
            .expect("migration 27");

        assert_eq!(migration_checksum(), migration.checksum.as_ref());
    }

    #[test]
    fn records_migration_27_when_the_column_exists_but_history_does_not() {
        // CASE: migration 27 added the column but crashed before recording its history.
        // VALIDATES: startup repair records the already-applied migration safely.
        let database = temporary_database_path();
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&database)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            connection
                .execute("CREATE TABLE _sqlx_migrations (version INTEGER PRIMARY KEY, description TEXT NOT NULL, installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, success BOOLEAN NOT NULL, checksum BLOB NOT NULL, execution_time BIGINT NOT NULL)")
                .await
                .expect("migration table");
            connection
                .execute("INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time) VALUES (26, 'cash_management', TRUE, X'00', 1)")
                .await
                .expect("migration history");
            connection
                .execute("CREATE TABLE printers (label_orientation TEXT)")
                .await
                .expect("printers table");
            connection.close().await.expect("close sqlite database");
        });

        let staged = database.with_extension("staged.db");
        let source_before = fs::read(&database).expect("source bytes");
        fs::copy(&database, &staged).expect("stage database");
        tauri::async_runtime::block_on(repair_partial_label_orientation_migration(&staged))
            .expect("repair migration history");
        assert_eq!(fs::read(&database).expect("source bytes"), source_before);

        let has_migration = tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&staged)
                .read_only(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            let result: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM _sqlx_migrations WHERE version = 27 AND success = TRUE",
            )
            .fetch_one(&mut connection)
            .await
            .expect("migration history query");
            connection.close().await.expect("close sqlite database");
            result
        });

        assert_eq!(has_migration, 1);
        let _ = fs::remove_file(database);
        let _ = fs::remove_file(staged);
    }

    #[test]
    fn requires_the_mixed_payment_migration_file() {
        let migration_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("migrations")
            .join("0028_mixed_payments.sql");

        assert!(migration_path.is_file());
    }

    #[test]
    fn migrates_legacy_cash_and_allows_one_payment_per_method() {
        let database = temporary_database_path();
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&database)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            connection
                .execute("CREATE TABLE orders (id TEXT PRIMARY KEY, total INTEGER NOT NULL)")
                .await
                .expect("orders table");
            connection
                .execute("CREATE TABLE payments (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, method TEXT NOT NULL, amount INTEGER NOT NULL, created_at INTEGER NOT NULL)")
                .await
                .expect("payments table");
            connection
                .execute("CREATE UNIQUE INDEX idx_payments_order_id ON payments (order_id)")
                .await
                .expect("legacy payment index");
            connection
                .execute("INSERT INTO orders (id, total) VALUES ('order-1', 1000)")
                .await
                .expect("order row");
            connection
                .execute("INSERT INTO payments (id, order_id, method, amount, created_at) VALUES ('payment-1', 'order-1', 'cash', 1200, 1)")
                .await
                .expect("cash row");

            for statement in include_str!("../migrations/0028_mixed_payments.sql").split(';') {
                let statement = statement.trim();
                if !statement.is_empty() {
                    connection
                        .execute(statement)
                        .await
                        .expect("migration statement");
                }
            }

            let (amount, cash_received): (i64, Option<i64>) =
                sqlx::query_as("SELECT amount, cash_received FROM payments WHERE id = 'payment-1'")
                    .fetch_one(&mut connection)
                    .await
                    .expect("normalized cash row");
            assert_eq!(amount, 1000);
            assert_eq!(cash_received, Some(1200));

            connection
                .execute("INSERT INTO payments (id, order_id, method, amount, created_at) VALUES ('payment-2', 'order-1', 'card', 0, 2)")
                .await
                .expect("card row for same order");
            let duplicate_cash = connection
                .execute("INSERT INTO payments (id, order_id, method, amount, created_at) VALUES ('payment-3', 'order-1', 'cash', 0, 3)")
                .await;
            assert!(duplicate_cash.is_err());

            connection.close().await.expect("close sqlite database");
        });
        let _ = fs::remove_file(database);
    }

    #[test]
    fn rejects_failed_or_mismatched_migration_history() {
        // CASE: migration history is failed or has a checksum from another SQL body.
        // VALIDATES: compatibility repair fails closed instead of masking corruption.
        for (success, checksum, expected_error) in [
            (
                false,
                migration_checksum(),
                "Migration 27 is marked as failed",
            ),
            (true, vec![0_u8], "Migration 27 has an unexpected checksum"),
        ] {
            let database = temporary_database_path();
            tauri::async_runtime::block_on(seed_migration_state(&database, success, checksum));

            let error = tauri::async_runtime::block_on(repair_partial_label_orientation_migration(
                &database,
            ))
            .expect_err("invalid migration history should be rejected");

            assert!(error.contains(expected_error));
            let _ = fs::remove_file(database);
        }
    }
}
