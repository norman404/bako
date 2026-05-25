import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import * as schema from "@/shared/db/schema";

const DB_URL = "sqlite:bako.db";

type SqlClient = Awaited<ReturnType<typeof Database.load>>;
type SqliteMethod = "run" | "all" | "values" | "get";
type SqlResponse = {
  rows: unknown[] | unknown[][];
};
type SqlExecutor = (sql: string, params: unknown[], method: SqliteMethod) => Promise<SqlResponse>;

let sqlClient: SqlClient | null = null;
let databaseQueue: Promise<void> = Promise.resolve();

async function getSqlClient(): Promise<SqlClient> {
  if (!sqlClient) {
    sqlClient = await Database.load(DB_URL);
  }

  return sqlClient;
}

async function executeSql(
  client: SqlClient,
  sql: string,
  params: unknown[],
  method: SqliteMethod,
): Promise<SqlResponse> {
  if (method === "run") {
    await client.execute(sql, params);
    return { rows: [] };
  }

  const rows = await client.select<Record<string, unknown>[]>(sql, params);
  const values = rows.map((row) => Object.values(row));

  if (method === "get") {
    return { rows: values[0] ?? [] };
  }

  return { rows: values };
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
  await getSqlClient();
}

export const db = createDatabase(async (sql, params, method) =>
  runExclusive(async () => executeSql(await getSqlClient(), sql, params, method)),
);

export type DatabaseClient = typeof db;

export async function withTransaction<T>(operation: (tx: DatabaseClient) => Promise<T>): Promise<T> {
  return runExclusive(async () => {
    const client = await getSqlClient();
    const tx = createDatabase((sql, params, method) => executeSql(client, sql, params, method));

    await client.execute("BEGIN");

    try {
      const result = await operation(tx);
      await client.execute("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.execute("ROLLBACK");
      } catch {}

      throw error;
    }
  });
}

export { schema };
