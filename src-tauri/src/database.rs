//! Single pinned SQLite connection for all frontend queries.
//!
//! `tauri-plugin-sql` routes every `execute`/`select` through a sqlx pool, so
//! `BEGIN`, the statements and `COMMIT` can land on different connections.
//! Statements then autocommit on their own and a failed `COMMIT` reports an
//! error for data that was already saved. This module keeps one connection and
//! lets a transaction own it until it commits or rolls back.

use serde::Serialize;
use serde_json::Value as JsonValue;
use sqlx::query::Query;
use sqlx::sqlite::{SqliteArguments, SqliteConnectOptions, SqliteRow, SqliteValueRef};
use sqlx::{AssertSqlSafe, Connection, Row, Sqlite, SqliteConnection, TypeInfo, Value, ValueRef};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager, Runtime, State};
use tokio::sync::{Mutex, OwnedMutexGuard};

type ConnectionSlot = Option<SqliteConnection>;
type ConnectionGuard = OwnedMutexGuard<ConnectionSlot>;

#[derive(Default)]
pub struct DatabaseState {
    connection: Arc<Mutex<ConnectionSlot>>,
    transactions: Mutex<HashMap<u64, ConnectionGuard>>,
    next_transaction_id: AtomicU64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteResult {
    rows_affected: u64,
    last_insert_id: i64,
}

async fn ensure_open(path: &Path, slot: &mut ConnectionSlot) -> Result<(), String> {
    if slot.is_some() {
        return Ok(());
    }

    // The file is created and migrated by tauri-plugin-sql during `initDatabase`.
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false);
    let connection = SqliteConnection::connect_with(&options)
        .await
        .map_err(|error| format!("Could not open database: {error}"))?;
    *slot = Some(connection);
    Ok(())
}

fn connection_mut(slot: &mut ConnectionSlot) -> Result<&mut SqliteConnection, String> {
    slot.as_mut()
        .ok_or_else(|| "Database connection is closed".to_string())
}

// Same binding rules as tauri-plugin-sql so stored values do not change.
fn bind_values(sql: String, values: Vec<JsonValue>) -> Query<'static, Sqlite, SqliteArguments> {
    let mut query = sqlx::query(AssertSqlSafe(sql));
    for value in values {
        query = match value {
            JsonValue::Null => query.bind(None::<String>),
            JsonValue::String(text) => query.bind(text),
            JsonValue::Number(number) => query.bind(number.as_f64().unwrap_or_default()),
            other => query.bind(other.to_string()),
        };
    }
    query
}

fn value_to_json(value: SqliteValueRef) -> JsonValue {
    if value.is_null() {
        return JsonValue::Null;
    }

    let owned = value.to_owned();
    match value.type_info().name() {
        "INTEGER" | "NUMERIC" | "BOOLEAN" => owned
            .try_decode::<i64>()
            .map(JsonValue::from)
            .unwrap_or(JsonValue::Null),
        "REAL" => owned
            .try_decode::<f64>()
            .map(JsonValue::from)
            .unwrap_or(JsonValue::Null),
        "BLOB" => owned
            .try_decode::<Vec<u8>>()
            .map(|bytes| JsonValue::Array(bytes.into_iter().map(JsonValue::from).collect()))
            .unwrap_or(JsonValue::Null),
        _ => owned
            .try_decode::<String>()
            .map(JsonValue::String)
            .unwrap_or(JsonValue::Null),
    }
}

// Positional values keep duplicate column names (joins) intact for drizzle.
fn row_to_values(row: &SqliteRow) -> Vec<JsonValue> {
    (0..row.len())
        .map(|index| {
            row.try_get_raw(index)
                .map(value_to_json)
                .unwrap_or(JsonValue::Null)
        })
        .collect()
}

async fn run_execute(
    connection: &mut SqliteConnection,
    sql: String,
    values: Vec<JsonValue>,
) -> Result<ExecuteResult, String> {
    let result = bind_values(sql, values)
        .execute(connection)
        .await
        .map_err(|error| error.to_string())?;
    Ok(ExecuteResult {
        rows_affected: result.rows_affected(),
        last_insert_id: result.last_insert_rowid(),
    })
}

async fn run_select(
    connection: &mut SqliteConnection,
    sql: String,
    values: Vec<JsonValue>,
) -> Result<Vec<Vec<JsonValue>>, String> {
    let rows = bind_values(sql, values)
        .fetch_all(connection)
        .await
        .map_err(|error| error.to_string())?;
    Ok(rows.iter().map(row_to_values).collect())
}

impl DatabaseState {
    async fn take_transaction(&self, transaction_id: u64) -> Result<ConnectionGuard, String> {
        self.transactions
            .lock()
            .await
            .remove(&transaction_id)
            .ok_or_else(|| format!("Unknown transaction {transaction_id}"))
    }

    async fn return_transaction(&self, transaction_id: u64, guard: ConnectionGuard) {
        self.transactions.lock().await.insert(transaction_id, guard);
    }

    pub async fn execute(
        &self,
        path: &Path,
        sql: String,
        values: Vec<JsonValue>,
        transaction_id: Option<u64>,
    ) -> Result<ExecuteResult, String> {
        match transaction_id {
            Some(id) => {
                let mut guard = self.take_transaction(id).await?;
                let result = match connection_mut(&mut guard) {
                    Ok(connection) => run_execute(connection, sql, values).await,
                    Err(error) => Err(error),
                };
                self.return_transaction(id, guard).await;
                result
            }
            None => {
                let mut slot = self.connection.lock().await;
                ensure_open(path, &mut slot).await?;
                run_execute(connection_mut(&mut slot)?, sql, values).await
            }
        }
    }

    pub async fn select(
        &self,
        path: &Path,
        sql: String,
        values: Vec<JsonValue>,
        transaction_id: Option<u64>,
    ) -> Result<Vec<Vec<JsonValue>>, String> {
        match transaction_id {
            Some(id) => {
                let mut guard = self.take_transaction(id).await?;
                let result = match connection_mut(&mut guard) {
                    Ok(connection) => run_select(connection, sql, values).await,
                    Err(error) => Err(error),
                };
                self.return_transaction(id, guard).await;
                result
            }
            None => {
                let mut slot = self.connection.lock().await;
                ensure_open(path, &mut slot).await?;
                run_select(connection_mut(&mut slot)?, sql, values).await
            }
        }
    }

    /// Locks the connection for the whole transaction: queries without the
    /// returned id wait until `commit` or `rollback` releases it.
    pub async fn begin(&self, path: &Path) -> Result<u64, String> {
        let mut guard = self.connection.clone().lock_owned().await;
        ensure_open(path, &mut guard).await?;
        sqlx::query("BEGIN IMMEDIATE")
            .execute(connection_mut(&mut guard)?)
            .await
            .map_err(|error| error.to_string())?;

        let id = self.next_transaction_id.fetch_add(1, Ordering::Relaxed);
        self.transactions.lock().await.insert(id, guard);
        Ok(id)
    }

    pub async fn commit(&self, transaction_id: u64) -> Result<(), String> {
        let mut guard = self.take_transaction(transaction_id).await?;
        let connection = connection_mut(&mut guard)?;
        if let Err(error) = sqlx::query("COMMIT").execute(&mut *connection).await {
            // Never leave the pinned connection inside an open transaction.
            let _ = sqlx::query("ROLLBACK").execute(&mut *connection).await;
            return Err(error.to_string());
        }
        Ok(())
    }

    pub async fn rollback(&self, transaction_id: u64) -> Result<(), String> {
        let mut guard = self.take_transaction(transaction_id).await?;
        sqlx::query("ROLLBACK")
            .execute(connection_mut(&mut guard)?)
            .await
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    /// Closes the pinned connection (used before restoring a backup).
    /// The next query reopens it.
    pub async fn close(&self) -> Result<(), String> {
        let mut slot = self.connection.lock().await;
        if let Some(connection) = slot.take() {
            connection.close().await.map_err(|error| error.to_string())?;
        }
        Ok(())
    }
}

fn database_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not resolve app config directory: {error}"))?;
    path.push(crate::DATABASE_FILENAME);
    Ok(path)
}

#[tauri::command]
pub async fn db_execute<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, DatabaseState>,
    sql: String,
    values: Vec<JsonValue>,
    transaction_id: Option<u64>,
) -> Result<ExecuteResult, String> {
    state
        .execute(&database_path(&app)?, sql, values, transaction_id)
        .await
}

#[tauri::command]
pub async fn db_select<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, DatabaseState>,
    sql: String,
    values: Vec<JsonValue>,
    transaction_id: Option<u64>,
) -> Result<Vec<Vec<JsonValue>>, String> {
    state
        .select(&database_path(&app)?, sql, values, transaction_id)
        .await
}

#[tauri::command]
pub async fn db_begin<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, DatabaseState>,
) -> Result<u64, String> {
    state.begin(&database_path(&app)?).await
}

#[tauri::command]
pub async fn db_commit(state: State<'_, DatabaseState>, transaction_id: u64) -> Result<(), String> {
    state.commit(transaction_id).await
}

#[tauri::command]
pub async fn db_rollback(
    state: State<'_, DatabaseState>,
    transaction_id: u64,
) -> Result<(), String> {
    state.rollback(transaction_id).await
}

#[tauri::command]
pub async fn db_close(state: State<'_, DatabaseState>) -> Result<(), String> {
    state.close().await
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    static TEMPORARY_DATABASE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    fn temporary_database_path() -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        let sequence = TEMPORARY_DATABASE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir().join(format!(
            "bako-pinned-connection-test-{}-{suffix}-{sequence}.db",
            std::process::id()
        ))
    }

    async fn seeded_database() -> PathBuf {
        let path = temporary_database_path();
        let options = SqliteConnectOptions::new()
            .filename(&path)
            .create_if_missing(true);
        let mut connection = SqliteConnection::connect_with(&options)
            .await
            .expect("create database");
        sqlx::query(
            "CREATE TABLE orders (id TEXT PRIMARY KEY, ticket_number INTEGER NOT NULL UNIQUE, total INTEGER NOT NULL, note TEXT)",
        )
        .execute(&mut connection)
        .await
        .expect("create table");
        connection.close().await.expect("close seed connection");
        path
    }

    async fn count_orders(state: &DatabaseState, path: &Path) -> i64 {
        let rows = state
            .select(path, "SELECT COUNT(*) FROM orders".into(), vec![], None)
            .await
            .expect("count orders");
        rows[0][0].as_i64().expect("count value")
    }

    fn insert_sql() -> String {
        "INSERT INTO orders (id, ticket_number, total) VALUES (?, ?, ?)".into()
    }

    fn cleanup(path: &Path) {
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn rolls_back_every_statement_when_a_later_statement_fails() {
        // CASE: checkout inserts the order and then a follow-up insert fails.
        // VALIDATES: rollback removes the order, so a retry cannot duplicate it.
        tauri::async_runtime::block_on(async {
            let path = seeded_database().await;
            let state = DatabaseState::default();

            let tx = state.begin(&path).await.expect("begin");
            state
                .execute(&path, insert_sql(), vec![json!("order-1"), json!(1), json!(9500)], Some(tx))
                .await
                .expect("insert order");
            let duplicate_ticket = state
                .execute(&path, insert_sql(), vec![json!("order-2"), json!(1), json!(9500)], Some(tx))
                .await;
            assert!(duplicate_ticket.is_err());
            state.rollback(tx).await.expect("rollback");

            assert_eq!(count_orders(&state, &path).await, 0);
            state.close().await.expect("close");
            cleanup(&path);
        });
    }

    #[test]
    fn commits_all_statements_of_a_transaction_together() {
        // CASE: a transaction inserts several rows and commits.
        // VALIDATES: every row is visible after commit.
        tauri::async_runtime::block_on(async {
            let path = seeded_database().await;
            let state = DatabaseState::default();

            let tx = state.begin(&path).await.expect("begin");
            for ticket in 1..=3 {
                state
                    .execute(
                        &path,
                        insert_sql(),
                        vec![json!(format!("order-{ticket}")), json!(ticket), json!(100)],
                        Some(tx),
                    )
                    .await
                    .expect("insert order");
            }
            state.commit(tx).await.expect("commit");

            assert_eq!(count_orders(&state, &path).await, 3);
            state.close().await.expect("close");
            cleanup(&path);
        });
    }

    #[test]
    fn queries_outside_the_transaction_wait_until_it_finishes() {
        // CASE: another caller writes while a transaction owns the connection.
        // VALIDATES: the outside write is not swallowed by the transaction's rollback.
        tauri::async_runtime::block_on(async {
            let path = seeded_database().await;
            let state = Arc::new(DatabaseState::default());

            let tx = state.begin(&path).await.expect("begin");
            let outside = {
                let state = Arc::clone(&state);
                let path = path.clone();
                tauri::async_runtime::spawn(async move {
                    state
                        .execute(&path, insert_sql(), vec![json!("outside"), json!(99), json!(1)], None)
                        .await
                })
            };

            yield_to_other_tasks().await;
            state
                .execute(&path, insert_sql(), vec![json!("inside"), json!(1), json!(1)], Some(tx))
                .await
                .expect("insert inside transaction");
            state.rollback(tx).await.expect("rollback");

            outside.await.expect("join").expect("outside insert");
            let rows = state
                .select(&path, "SELECT id FROM orders".into(), vec![], None)
                .await
                .expect("select");
            assert_eq!(rows, vec![vec![json!("outside")]]);
            state.close().await.expect("close");
            cleanup(&path);
        });
    }

    async fn yield_to_other_tasks() {
        // Give the spawned query a chance to run if it were not blocked.
        let deadline = std::time::Instant::now() + Duration::from_millis(50);
        while std::time::Instant::now() < deadline {
            tokio::task::yield_now().await;
        }
    }

    #[test]
    fn keeps_the_plugin_value_encoding() {
        // CASE: drizzle sends numbers, strings and nulls as JSON.
        // VALIDATES: integers come back as integers, text as text, null as null,
        // and columns are positional.
        tauri::async_runtime::block_on(async {
            let path = seeded_database().await;
            let state = DatabaseState::default();

            let result = state
                .execute(
                    &path,
                    "INSERT INTO orders (id, ticket_number, total, note) VALUES (?, ?, ?, ?)".into(),
                    vec![json!("order-1"), json!(7), json!(9500), JsonValue::Null],
                    None,
                )
                .await
                .expect("insert");
            assert_eq!(result.rows_affected, 1);

            let rows = state
                .select(
                    &path,
                    "SELECT id, ticket_number, total, note, id FROM orders WHERE ticket_number = ?".into(),
                    vec![json!(7)],
                    None,
                )
                .await
                .expect("select");
            assert_eq!(
                rows,
                vec![vec![json!("order-1"), json!(7), json!(9500), JsonValue::Null, json!("order-1")]]
            );
            state.close().await.expect("close");
            cleanup(&path);
        });
    }

    #[test]
    fn rejects_statements_for_an_unknown_transaction() {
        // CASE: the frontend references a transaction that already finished.
        // VALIDATES: the statement fails instead of silently autocommitting.
        tauri::async_runtime::block_on(async {
            let path = seeded_database().await;
            let state = DatabaseState::default();

            let tx = state.begin(&path).await.expect("begin");
            state.commit(tx).await.expect("commit");
            let late = state
                .execute(&path, insert_sql(), vec![json!("late"), json!(1), json!(1)], Some(tx))
                .await;

            assert!(late.is_err());
            assert_eq!(count_orders(&state, &path).await, 0);
            state.close().await.expect("close");
            cleanup(&path);
        });
    }
}
