use sqlx::migrate::{Migration, MigrationType};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{AssertSqlSafe, Connection, SqlSafeStr, SqlStr, SqliteConnection};
use std::borrow::Cow;
use std::path::{Path, PathBuf};
use tauri::{Manager, Runtime};

pub const LABEL_ORIENTATION_MIGRATION_VERSION: i64 = 27;
const LABEL_ORIENTATION_MIGRATION_DESCRIPTION: &str = "printer_label_orientation";
const LABEL_ORIENTATION_MIGRATION_SQL: &str =
    include_str!("../migrations/0027_printer_label_orientation.sql");
const PRODUCT_COSTS_MIGRATION_VERSION: i64 = 31;
const PRODUCT_COSTS_MIGRATION_DESCRIPTION: &str = "product_costs";
const PRODUCT_COSTS_MIGRATION_SQL: &str = include_str!("../migrations/0031_product_costs.sql");

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

fn product_costs_migration_checksum() -> Vec<u8> {
    Migration::new(
        PRODUCT_COSTS_MIGRATION_VERSION,
        Cow::Borrowed(PRODUCT_COSTS_MIGRATION_DESCRIPTION),
        MigrationType::ReversibleUp,
        SqlStr::from_static(PRODUCT_COSTS_MIGRATION_SQL),
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

async fn apply_pending_product_costs_migration(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    let mut connection = open_database(path).await?;
    let latest: Option<i64> =
        sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations WHERE success = TRUE")
            .fetch_one(&mut connection)
            .await
            .map_err(|error| format!("Could not inspect migration history: {error}"))?;

    if latest != Some(PRODUCT_COSTS_MIGRATION_VERSION - 1) {
        connection
            .close()
            .await
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("Could not start product costs migration: {error}"))?;
    for statement in PRODUCT_COSTS_MIGRATION_SQL
        .split(';')
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        sqlx::query(statement)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("Could not apply product costs migration: {error}"))?;
    }
    sqlx::query(
        "INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time) VALUES (?, ?, TRUE, ?, -1)",
    )
    .bind(PRODUCT_COSTS_MIGRATION_VERSION)
    .bind(PRODUCT_COSTS_MIGRATION_DESCRIPTION)
    .bind(product_costs_migration_checksum())
    .execute(&mut *transaction)
    .await
    .map_err(|error| format!("Could not record product costs migration: {error}"))?;
    transaction
        .commit()
        .await
        .map_err(|error| format!("Could not commit product costs migration: {error}"))
}

/// A shipped migration as the running build embeds it: its version and exact SQL text.
#[derive(Clone, Copy)]
pub struct MigrationSource {
    pub version: i64,
    pub sql: &'static str,
}

fn sql_checksum(version: i64, sql: String) -> Vec<u8> {
    Migration::new(
        version,
        Cow::Borrowed(""),
        MigrationType::ReversibleUp,
        AssertSqlSafe(sql).into_sql_str(),
        false,
    )
    .checksum
    .into_owned()
}

/// sqlx checksums the exact bytes of each migration. A Windows checkout converts the
/// `.sql` files to CRLF, so a database created by a Windows build and restored on
/// another platform (or the reverse) looks "modified" and can never migrate again. A
/// stored checksum is realigned only when it equals the LF or CRLF variant of the very
/// same SQL, which proves the applied migration is identical; anything else still fails.
pub async fn repair_line_ending_checksums(
    path: &Path,
    sources: &[MigrationSource],
) -> Result<u64, String> {
    if !path.exists() {
        return Ok(0);
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
        return Ok(0);
    }

    let applied: Vec<(i64, Vec<u8>)> =
        sqlx::query_as("SELECT version, checksum FROM _sqlx_migrations WHERE success = TRUE")
            .fetch_all(&mut connection)
            .await
            .map_err(|error| format!("Could not read migration checksums: {error}"))?;

    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("Could not start checksum repair: {error}"))?;
    let mut repaired = 0;
    for (version, stored) in applied {
        let Some(source) = sources.iter().find(|source| source.version == version) else {
            continue;
        };
        let expected = sql_checksum(version, source.sql.to_owned());
        if stored == expected {
            continue;
        }

        let lf = source.sql.replace("\r\n", "\n");
        let crlf = lf.replace('\n', "\r\n");
        if stored != sql_checksum(version, lf) && stored != sql_checksum(version, crlf) {
            continue;
        }

        sqlx::query("UPDATE _sqlx_migrations SET checksum = ? WHERE version = ?")
            .bind(expected)
            .bind(version)
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("Could not repair checksum of migration {version}: {error}"))?;
        repaired += 1;
    }
    transaction
        .commit()
        .await
        .map_err(|error| format!("Could not commit checksum repair: {error}"))?;

    Ok(repaired)
}

pub fn init<R: Runtime>(sources: Vec<MigrationSource>) -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("database-migrations")
        .setup(move |app, _api| {
            let mut path = app
                .path()
                .app_config_dir()
                .map_err(|error| format!("Could not resolve database directory: {error}"))?;
            path.push(PathBuf::from(crate::DATABASE_FILENAME));

            match tauri::async_runtime::block_on(repair_line_ending_checksums(&path, &sources)) {
                Ok(0) => {}
                Ok(repaired) => log::info!("Realigned {repaired} migration checksums that differed only in line endings"),
                Err(error) => {
                    log::error!("Database checksum repair failed: {error}");
                    return Err(Box::new(std::io::Error::other(error)));
                }
            }

            if let Err(error) =
                tauri::async_runtime::block_on(repair_partial_label_orientation_migration(&path))
            {
                log::error!("Database migration compatibility repair failed: {error}");
                return Err(Box::new(std::io::Error::other(error)));
            }
            if let Err(error) =
                tauri::async_runtime::block_on(apply_pending_product_costs_migration(&path))
            {
                log::error!("Database startup migration failed: {error}");
                return Err(Box::new(std::io::Error::other(error)));
            }
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::{
        apply_pending_product_costs_migration, migration_checksum,
        repair_partial_label_orientation_migration, LABEL_ORIENTATION_MIGRATION_VERSION,
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
    fn applies_shift_list_order_migration_to_an_existing_settings_row() {
        // CASE: An existing database has system settings before migration 29 runs.
        // VALIDATES: The migration adds descending as the default without losing the row.
        let migration_sql = include_str!("../migrations/0029_shift_list_order.sql");
        let database = temporary_database_path();
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&database)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            connection
                .execute("CREATE TABLE system_settings (id TEXT PRIMARY KEY NOT NULL, locale TEXT NOT NULL, currency TEXT NOT NULL, updated_at INTEGER NOT NULL)")
                .await
                .expect("legacy settings table");
            connection
                .execute("INSERT INTO system_settings (id, locale, currency, updated_at) VALUES ('current', 'es-MX', 'MXN', 1)")
                .await
                .expect("existing settings row");

            for statement in migration_sql.split(';') {
                let statement = statement.trim();
                if !statement.is_empty() {
                    sqlx::query(statement)
                        .execute(&mut connection)
                        .await
                        .expect("migration statement");
                }
            }

            let (locale, order): (String, String) = sqlx::query_as(
                "SELECT locale, shift_list_order FROM system_settings WHERE id = 'current'",
            )
            .fetch_one(&mut connection)
            .await
            .expect("migrated settings row");
            assert_eq!(locale, "es-MX");
            assert_eq!(order, "descending");
            connection.close().await.expect("close sqlite database");
        });
        let _ = fs::remove_file(database);
    }

    #[test]
    fn requires_the_mixed_payment_migration_file() {
        let migration_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("migrations")
            .join("0028_mixed_payments.sql");

        assert!(migration_path.is_file());
    }

    #[test]
    fn adds_nullable_order_name_to_existing_orders() {
        let database = temporary_database_path();
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&database)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            connection
                .execute("CREATE TABLE orders (id TEXT PRIMARY KEY, ticket_number INTEGER NOT NULL, total INTEGER NOT NULL, created_at INTEGER NOT NULL)")
                .await
                .expect("orders table");
            connection
                .execute(include_str!("../migrations/0030_order_name.sql"))
                .await
                .expect("order name migration");

            let column_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM pragma_table_info('orders') WHERE name = 'order_name'",
            )
            .fetch_one(&mut connection)
            .await
            .expect("order name column");
            assert_eq!(column_count, 1);

            connection
                .execute("INSERT INTO orders (id, ticket_number, total, created_at) VALUES ('order-1', 1, 100, 1)")
                .await
                .expect("legacy order");
            let order_name: Option<String> =
                sqlx::query_scalar("SELECT order_name FROM orders WHERE id = 'order-1'")
                    .fetch_one(&mut connection)
                    .await
                    .expect("nullable order name");
            assert_eq!(order_name, None);

            connection.close().await.expect("close sqlite database");
        });
        let _ = fs::remove_file(database);
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

    #[test]
    fn adds_product_cost_snapshots_without_changing_existing_values() {
        // CASE: an existing catalog and order history migrate to profitability reporting.
        // VALIDATES: both cost columns default safely and reject negative values.
        let database = temporary_database_path();
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&database)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            connection
                .execute("CREATE TABLE products (id TEXT PRIMARY KEY, price INTEGER NOT NULL)")
                .await
                .expect("products table");
            connection
                .execute(
                    "CREATE TABLE order_items (id TEXT PRIMARY KEY, unit_price INTEGER NOT NULL)",
                )
                .await
                .expect("order items table");
            connection
                .execute("INSERT INTO products (id, price) VALUES ('coffee', 500)")
                .await
                .expect("product row");
            connection
                .execute("INSERT INTO order_items (id, unit_price) VALUES ('item', 500)")
                .await
                .expect("item row");

            for statement in include_str!("../migrations/0031_product_costs.sql").split(';') {
                let statement = statement.trim();
                if !statement.is_empty() {
                    connection
                        .execute(statement)
                        .await
                        .expect("migration statement");
                }
            }

            let product_cost: i64 =
                sqlx::query_scalar("SELECT cost_price FROM products WHERE id = 'coffee'")
                    .fetch_one(&mut connection)
                    .await
                    .expect("product cost");
            let item_cost: i64 =
                sqlx::query_scalar("SELECT unit_cost FROM order_items WHERE id = 'item'")
                    .fetch_one(&mut connection)
                    .await
                    .expect("item cost");
            assert_eq!((product_cost, item_cost), (0, 0));
            assert!(connection
                .execute("UPDATE products SET cost_price = -1 WHERE id = 'coffee'")
                .await
                .is_err());
            connection.close().await.expect("close sqlite database");
        });
        let _ = fs::remove_file(database);
    }

    #[test]
    fn applies_product_costs_before_the_frontend_opens_the_database() {
        // CASE: a restored database is on version 30 when the native process starts.
        // VALIDATES: startup adds and records version 31 without waiting for the webview.
        let database = temporary_database_path();
        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&database)
                .create_if_missing(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            connection.execute("CREATE TABLE _sqlx_migrations (version INTEGER PRIMARY KEY, description TEXT NOT NULL, installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, success BOOLEAN NOT NULL, checksum BLOB NOT NULL, execution_time BIGINT NOT NULL)").await.expect("migration table");
            connection.execute("INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time) VALUES (30, 'order_name', TRUE, X'00', 1)").await.expect("migration history");
            connection
                .execute("CREATE TABLE products (id TEXT PRIMARY KEY, price INTEGER NOT NULL)")
                .await
                .expect("products table");
            connection
                .execute(
                    "CREATE TABLE order_items (id TEXT PRIMARY KEY, unit_price INTEGER NOT NULL)",
                )
                .await
                .expect("order items table");
            connection.close().await.expect("close sqlite database");
        });

        tauri::async_runtime::block_on(apply_pending_product_costs_migration(&database))
            .expect("startup migration");

        tauri::async_runtime::block_on(async {
            let options = SqliteConnectOptions::new()
                .filename(&database)
                .read_only(true);
            let mut connection = SqliteConnection::connect_with(&options)
                .await
                .expect("sqlite database");
            let version: i64 = sqlx::query_scalar(
                "SELECT MAX(version) FROM _sqlx_migrations WHERE success = TRUE",
            )
            .fetch_one(&mut connection)
            .await
            .expect("migration version");
            let product_column: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM pragma_table_info('products') WHERE name = 'cost_price'",
            )
            .fetch_one(&mut connection)
            .await
            .expect("product column");
            let item_column: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM pragma_table_info('order_items') WHERE name = 'unit_cost'",
            )
            .fetch_one(&mut connection)
            .await
            .expect("item column");
            assert_eq!((version, product_column, item_column), (31, 1, 1));
            connection.close().await.expect("close sqlite database");
        });
        let _ = fs::remove_file(database);
    }
}


#[cfg(test)]
const SHIPPED_MIGRATIONS: &[&str] = &[
    include_str!("../migrations/0000_initial.sql"),
    include_str!("../migrations/0001_seed_menu.sql"),
    include_str!("../migrations/0002_orders_customers.sql"),
    include_str!("../migrations/0003_payments.sql"),
    include_str!("../migrations/0005_system_settings.sql"),
    include_str!("../migrations/0006_category_colors.sql"),
    include_str!("../migrations/0007_feature_flags.sql"),
    include_str!("../migrations/0008_menus.sql"),
    include_str!("../migrations/0009_product_menus.sql"),
    include_str!("../migrations/0010_delivery_persons.sql"),
    include_str!("../migrations/0011_printer_settings.sql"),
    include_str!("../migrations/0012_shifts.sql"),
    include_str!("../migrations/0013_updater_flag.sql"),
    include_str!("../migrations/0014_product_modifiers.sql"),
    include_str!("../migrations/0015_modifiers_flag_seed.sql"),
    include_str!("../migrations/0016_comandas_flag_seed.sql"),
    include_str!("../migrations/0017_printers_and_category_printer.sql"),
    include_str!("../migrations/0018_receipt_printing_flag_seed.sql"),
    include_str!("../migrations/0019_comanda_header_text.sql"),
    include_str!("../migrations/0020_first_option_free.sql"),
    include_str!("../migrations/0021_label_printer_columns.sql"),
    include_str!("../migrations/0022_label_printer_language.sql"),
    include_str!("../migrations/0023_printer_is_default.sql"),
    include_str!("../migrations/0024_printer_role_comanda.sql"),
    include_str!("../migrations/0025_voided_at_orders.sql"),
    include_str!("../migrations/0026_cash_management.sql"),
    include_str!("../migrations/0027_printer_label_orientation.sql"),
    include_str!("../migrations/0028_mixed_payments.sql"),
    include_str!("../migrations/0029_shift_list_order.sql"),
    include_str!("../migrations/0030_order_name.sql"),
    include_str!("../migrations/0031_product_costs.sql"),
    include_str!("../migrations/0032_delivery_orders.sql"),
    include_str!("../migrations/0033_payments_platform.sql"),
    include_str!("../migrations/0034_promotions.sql"),
];

#[cfg(test)]
mod delivery_orders_migration {
    use super::SHIPPED_MIGRATIONS;
    use sqlx::{Connection, Executor, SqliteConnection};

    async fn migrate_legacy_orders(url: &str) -> SqliteConnection {
        let mut db = SqliteConnection::connect(url).await.unwrap();
        db.execute("CREATE TABLE orders (id TEXT PRIMARY KEY, total INTEGER NOT NULL, created_at INTEGER NOT NULL, shift_id TEXT, voided_at INTEGER);
            CREATE TABLE shifts (id TEXT PRIMARY KEY, status TEXT, closed_at INTEGER);
            INSERT INTO shifts VALUES ('A', 'closed', 2000);
            INSERT INTO orders VALUES ('paid', 7000, 1000, 'A', NULL), ('voided', 5000, 1100, 'A', 1500), ('no-shift', 9000, 1200, NULL, NULL);")
            .await.unwrap();
        db.execute(include_str!("../migrations/0032_delivery_orders.sql")).await.unwrap();
        db
    }

    // CASE: An existing installation upgrades with paid, voided and shiftless sales.
    // VALIDATES: The migration preserves amounts, dates, cancellation and financial shift attribution.
    #[test]
    fn should_preserve_existing_sales_when_delivery_migration_runs() {
        tauri::async_runtime::block_on(async {
            // Arrange
            let mut db = migrate_legacy_orders("sqlite::memory:").await;
            // Act
            let rows: Vec<(String, i64, String, i64, Option<String>, Option<i64>)> = sqlx::query_as(
                "SELECT id, total, channel, confirmed_at, financial_shift_id, voided_at FROM orders ORDER BY id"
            ).fetch_all(&mut db).await.unwrap();
            // Assert
            assert_eq!(rows, vec![
                ("no-shift".into(), 9000, "local".into(), 1200, None, None),
                ("paid".into(), 7000, "local".into(), 1000, Some("A".into()), None),
                ("voided".into(), 5000, "local".into(), 1100, Some("A".into()), Some(1500)),
            ]);
        });
    }

    // CASE: A delivery is stored without collection and remains pending across app restarts.
    // VALIDATES: Pending state and closed-cut membership are persistent, not only UI state.
    #[test]
    fn should_store_pending_state_and_cut_membership_when_delivery_is_unconfirmed() {
        let suffix = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        let path = std::env::temp_dir().join(format!("bako-delivery-{}-{suffix}.db", std::process::id()));
        tauri::async_runtime::block_on(async {
            // Arrange
            let url = format!("sqlite:{}?mode=rwc", path.display());
            let mut db = migrate_legacy_orders(&url).await;
            db.execute("INSERT INTO orders (id, total, created_at, shift_id, channel, delivery_reference) VALUES ('delivery', 0, 1800, 'A', 'didi', 'APP-42');
                UPDATE shifts SET delivery_pending_ids = '[\"delivery\"]' WHERE id = 'A';").await.unwrap();
            // Act
            db.close().await.unwrap();
            let mut db = SqliteConnection::connect(&url).await.unwrap();
            let order: (i64, Option<i64>, Option<String>, String) = sqlx::query_as(
                "SELECT total, confirmed_at, financial_shift_id, delivery_reference FROM orders WHERE id = 'delivery'"
            ).fetch_one(&mut db).await.unwrap();
            let pending: String = sqlx::query_scalar("SELECT delivery_pending_ids FROM shifts WHERE id = 'A'").fetch_one(&mut db).await.unwrap();
            // Assert
            assert_eq!(order, (0, None, None, "APP-42".into()));
            assert_eq!(pending, "[\"delivery\"]");
            db.close().await.unwrap();
        });
        std::fs::remove_file(path).unwrap();
    }

    // CASE: A fresh installation applies the complete shipped SQL chain including delivery.
    // VALIDATES: The new migration is compatible with the real schema, not only a legacy fixture.
    #[test]
    fn should_apply_delivery_migration_when_installing_a_fresh_database() {
        tauri::async_runtime::block_on(async {
            // Arrange
            let mut db = SqliteConnection::connect("sqlite::memory:").await.unwrap();
            // Act
            for sql in SHIPPED_MIGRATIONS {
                db.execute(*sql).await.unwrap();
            }
            let columns: i64 = sqlx::query_scalar("SELECT count(*) FROM pragma_table_info('orders') WHERE name IN ('channel', 'delivery_reference', 'confirmed_at', 'financial_shift_id')")
                .fetch_one(&mut db).await.unwrap();
            // Assert
            assert_eq!(columns, 4);
        });
    }

    // CASE: Invalid channel data bypasses the TypeScript form.
    // VALIDATES: SQLite itself rejects unknown delivery sources.
    #[test]
    fn should_reject_an_unknown_channel_when_data_bypasses_the_form() {
        tauri::async_runtime::block_on(async {
            // Arrange
            let mut db = migrate_legacy_orders("sqlite::memory:").await;
            // Act
            let result = db.execute("INSERT INTO orders (id, total, created_at, channel) VALUES ('invalid', 0, 1800, 'unknown')").await;
            // Assert
            assert!(result.is_err());
        });
    }
}

#[cfg(test)]
mod payments_platform_migration {
    use sqlx::{Connection, Executor, SqliteConnection};

    // CASE: A platform collection is stored after the payments table was migrated.
    // VALIDATES: Existing cash rows survive and `platform` is now an accepted method.
    #[test]
    fn should_allow_platform_and_preserve_existing_payments_when_migration_runs() {
        tauri::async_runtime::block_on(async {
            // Arrange
            let mut db = SqliteConnection::connect("sqlite::memory:").await.unwrap();
            db.execute("CREATE TABLE orders (id TEXT PRIMARY KEY, total INTEGER NOT NULL);")
                .await
                .unwrap();
            db.execute(include_str!("../migrations/0003_payments.sql")).await.unwrap();
            db.execute(include_str!("../migrations/0028_mixed_payments.sql")).await.unwrap();
            db.execute("INSERT INTO orders (id, total) VALUES ('o', 7000);
                INSERT INTO payments (id, order_id, method, amount, cash_received, created_at)
                    VALUES ('p', 'o', 'cash', 7000, 7000, 1000);")
                .await
                .unwrap();
            // Act
            db.execute(include_str!("../migrations/0033_payments_platform.sql")).await.unwrap();
            db.execute("INSERT INTO payments (id, order_id, method, amount, cash_received, created_at)
                    VALUES ('q', 'o', 'platform', 0, NULL, 2000);")
                .await
                .unwrap();
            // Assert
            let rows: Vec<(String, i64)> =
                sqlx::query_as("SELECT method, amount FROM payments ORDER BY method")
                    .fetch_all(&mut db)
                    .await
                    .unwrap();
            assert_eq!(rows, vec![("cash".into(), 7000), ("platform".into(), 0)]);
            let rejected = db
                .execute("INSERT INTO payments (id, order_id, method, amount, created_at) VALUES ('r', 'o', 'other', 1, 3000)")
                .await;
            assert!(rejected.is_err());
        });
    }
}

#[cfg(test)]
mod promotions_migration {
    use super::SHIPPED_MIGRATIONS;
    use sqlx::{Connection, Executor, SqliteConnection};

    async fn fresh_database() -> SqliteConnection {
        let mut db = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        db.execute("PRAGMA foreign_keys = ON;").await.unwrap();
        for sql in SHIPPED_MIGRATIONS {
            db.execute(*sql).await.unwrap();
        }
        db.execute("INSERT INTO promotions (id, name, type, buy_quantity, pay_quantity, schedule, created_at, updated_at)
                VALUES ('p', '2x1', 'nxm', 2, 1, '{}', 1, 1);")
            .await
            .unwrap();
        db
    }

    // CASE: An installation upgrades with sales recorded before promotions existed.
    // VALIDATES: Existing sale lines default to no discount and new flags start disabled.
    #[test]
    fn should_default_existing_lines_to_no_discount_when_migration_runs() {
        tauri::async_runtime::block_on(async {
            // Arrange
            let mut db = fresh_database().await;
            // Act
            let flag: String = sqlx::query_scalar("SELECT value FROM feature_flags WHERE key = 'promotions_enabled'")
                .fetch_one(&mut db)
                .await
                .unwrap();
            let discount_default: String = sqlx::query_scalar(
                "SELECT dflt_value FROM pragma_table_info('order_items') WHERE name = 'discount_amount'",
            )
            .fetch_one(&mut db)
            .await
            .unwrap();
            // Assert
            assert_eq!(flag, "false");
            assert_eq!(discount_default, "0");
        });
    }

    // CASE: Invalid promotion rules bypass the TypeScript form.
    // VALIDATES: SQLite rejects an NxM that pays for everything, mixed rule columns and ambiguous targets.
    #[test]
    fn should_reject_invalid_promotion_rules_when_data_bypasses_the_form() {
        tauri::async_runtime::block_on(async {
            // Arrange
            let mut db = fresh_database().await;
            // Act
            let pays_all = db
                .execute("INSERT INTO promotions (id, name, type, buy_quantity, pay_quantity, schedule, created_at, updated_at)
                    VALUES ('a', 'bad', 'nxm', 2, 2, '{}', 1, 1)")
                .await;
            let mixed = db
                .execute("INSERT INTO promotions (id, name, type, bundle_price, buy_quantity, schedule, created_at, updated_at)
                    VALUES ('b', 'bad', 'bundle', 100, 2, '{}', 1, 1)")
                .await;
            let ambiguous_target = db
                .execute("INSERT INTO promotion_targets (id, promotion_id) VALUES ('t', 'p')")
                .await;
            // Assert
            assert!(pays_all.is_err());
            assert!(mixed.is_err());
            assert!(ambiguous_target.is_err());
        });
    }
}

#[cfg(test)]
mod line_ending_checksum_repair {
    use super::{repair_line_ending_checksums, sql_checksum, MigrationSource};
    use sqlx::migrate::{Migration, MigrationType, Migrator};
    use sqlx::sqlite::SqliteConnectOptions;
    use sqlx::{Connection, Executor, SqlStr, SqliteConnection, SqlitePool};
    use std::borrow::Cow;
    use std::path::PathBuf;

    const CREATE_ITEMS: &str = "CREATE TABLE items (id TEXT PRIMARY KEY);\nCREATE INDEX idx_items ON items (id);\n";
    const ADD_NAME: &str = "ALTER TABLE items ADD COLUMN name TEXT;\n";
    const ADD_PRICE: &str = "ALTER TABLE items ADD COLUMN price INTEGER;\n";
    const SOURCES: [MigrationSource; 2] = [
        MigrationSource { version: 1, sql: CREATE_ITEMS },
        MigrationSource { version: 2, sql: ADD_NAME },
    ];

    fn temporary_database_path() -> PathBuf {
        let suffix = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("bako-line-endings-{}-{suffix}.db", std::process::id()))
    }

    fn crlf(sql: &str) -> String {
        sql.replace('\n', "\r\n")
    }

    fn migration(version: i64, sql: &'static str) -> Migration {
        Migration::new(version, Cow::Borrowed("m"), MigrationType::ReversibleUp, SqlStr::from_static(sql), false)
    }

    // A database whose schema and history were written by a build with CRLF migrations.
    async fn create_windows_database(path: &PathBuf, tampered_version_2: bool) {
        let options = SqliteConnectOptions::new().filename(path).create_if_missing(true);
        let mut connection = SqliteConnection::connect_with(&options).await.unwrap();
        connection
            .execute("CREATE TABLE _sqlx_migrations (version INTEGER PRIMARY KEY, description TEXT NOT NULL, installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, success BOOLEAN NOT NULL, checksum BLOB NOT NULL, execution_time BIGINT NOT NULL)")
            .await
            .unwrap();
        connection.execute(sqlx::AssertSqlSafe(crlf(CREATE_ITEMS))).await.unwrap();
        connection.execute(sqlx::AssertSqlSafe(crlf(ADD_NAME))).await.unwrap();
        let version_2_checksum = if tampered_version_2 {
            sql_checksum(2, "ALTER TABLE items ADD COLUMN nombre TEXT;\r\n".to_owned())
        } else {
            sql_checksum(2, crlf(ADD_NAME))
        };
        for (version, checksum) in [(1, sql_checksum(1, crlf(CREATE_ITEMS))), (2, version_2_checksum)] {
            sqlx::query("INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time) VALUES (?, 'm', TRUE, ?, 1)")
                .bind(version)
                .bind(checksum)
                .execute(&mut connection)
                .await
                .unwrap();
        }
        connection.close().await.unwrap();
    }

    // CASE: A backup made on Windows is restored on macOS and a new migration ships.
    // VALIDATES: sqlx rejects it as modified before the repair, and after the repair the real
    // migrator accepts the history and applies the pending migration.
    #[test]
    fn should_let_a_restored_crlf_database_apply_new_migrations() {
        let path = temporary_database_path();
        tauri::async_runtime::block_on(async {
            // Arrange
            create_windows_database(&path, false).await;
            let url = format!("sqlite:{}", path.display());
            let migrator = Migrator::with_migrations(vec![
                migration(1, CREATE_ITEMS),
                migration(2, ADD_NAME),
                migration(3, ADD_PRICE),
            ]);
            let pool = SqlitePool::connect(&url).await.unwrap();
            let before = migrator.run(&pool).await;
            pool.close().await;

            // Act
            let repaired = repair_line_ending_checksums(&path, &SOURCES).await.unwrap();
            let pool = SqlitePool::connect(&url).await.unwrap();
            let after = migrator.run(&pool).await;
            let price_column: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM pragma_table_info('items') WHERE name = 'price'")
                .fetch_one(&pool)
                .await
                .unwrap();
            pool.close().await;

            // Assert
            assert!(matches!(before, Err(sqlx::migrate::MigrateError::VersionMismatch(1))));
            assert_eq!(repaired, 2);
            assert!(after.is_ok(), "{after:?}");
            assert_eq!(price_column, 1);
        });
        let _ = std::fs::remove_file(path);
    }

    // CASE: A migration's stored checksum differs by more than line endings.
    // VALIDATES: Genuinely different SQL is never "repaired", so sqlx still reports it.
    #[test]
    fn should_not_realign_a_migration_whose_sql_really_differs() {
        let path = temporary_database_path();
        tauri::async_runtime::block_on(async {
            // Arrange
            create_windows_database(&path, true).await;

            // Act
            let repaired = repair_line_ending_checksums(&path, &SOURCES).await.unwrap();
            let pool = SqlitePool::connect(&format!("sqlite:{}", path.display())).await.unwrap();
            let stored: Vec<u8> = sqlx::query_scalar("SELECT checksum FROM _sqlx_migrations WHERE version = 2")
                .fetch_one(&pool)
                .await
                .unwrap();
            pool.close().await;

            // Assert
            assert_eq!(repaired, 1);
            assert_ne!(stored, sql_checksum(2, ADD_NAME.to_owned()));
        });
        let _ = std::fs::remove_file(path);
    }

    // CASE: A normal installation whose history already matches the running build starts up.
    // VALIDATES: The repair is a no-op, including for a fresh install without a database.
    #[test]
    fn should_leave_matching_or_missing_databases_untouched() {
        let missing = temporary_database_path();
        tauri::async_runtime::block_on(async {
            // Act
            let repaired = repair_line_ending_checksums(&missing, &SOURCES).await.unwrap();

            // Assert
            assert_eq!(repaired, 0);
            assert!(!missing.exists());
        });
    }
}
