import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import * as schema from "@/db/schema";

const DATABASE_URL = "sqlite:bako.db";

type SqliteMethod = "run" | "all" | "values" | "get";
type SqlResponse = {
  rows: unknown[] | unknown[][];
};
type SqlExecutor = (sql: string, params: unknown[], method: SqliteMethod) => Promise<SqlResponse>;

let databaseQueue: Promise<void> = Promise.resolve();

// Queries run on a single pinned connection in Rust (see src-tauri/src/database.rs).
// tauri-plugin-sql is only used to run migrations: its pool spreads BEGIN, the
// statements and COMMIT across different connections, which breaks transactions.
async function executeSql(
  sql: string,
  params: unknown[],
  method: SqliteMethod,
  transactionId?: number,
): Promise<SqlResponse> {
  if (method === "run") {
    await invoke("db_execute", { sql, values: params, transactionId });
    return { rows: [] };
  }

  const rows = await invoke<unknown[][]>("db_select", { sql, values: params, transactionId });

  if (method === "get") {
    return { rows: rows[0] ?? [] };
  }

  return { rows };
}

function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const scheduledOperation = databaseQueue.catch(() => undefined).then(operation);

  databaseQueue = scheduledOperation.then(
    () => undefined,
    () => undefined,
  );

  return scheduledOperation;
}

function createDatabase(execute: SqlExecutor) {
  return drizzle(execute, { schema });
}

export async function initDatabase(): Promise<void> {
  // Loading through the plugin creates the file and applies pending migrations.
  // Its pool is closed right away so every query goes through the pinned connection.
  const migrator = await Database.load(DATABASE_URL);
  await migrator.close(DATABASE_URL);
}

export async function closeDatabase(): Promise<void> {
  await runExclusive(() => invoke<void>("db_close"));
}

export const db = createDatabase(async (sql, params, method) =>
  runExclusive(() => executeSql(sql, params, method)),
);

export type DatabaseClient = typeof db;

export async function withTransaction<T>(operation: (tx: DatabaseClient) => Promise<T>): Promise<T> {
  return runExclusive(async () => {
    const transactionId = await invoke<number>("db_begin");
    const tx = createDatabase((sql, params, method) => executeSql(sql, params, method, transactionId));

    try {
      const result = await operation(tx);
      await invoke("db_commit", { transactionId });
      return result;
    } catch (error) {
      // A failed commit is already rolled back in Rust; this covers errors inside `operation`.
      await invoke("db_rollback", { transactionId }).catch(() => undefined);
      throw error;
    }
  });
}
