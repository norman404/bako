import type { SqliteConnection } from "../seed";

export async function createBunConnection(
  dbPath: string,
): Promise<SqliteConnection> {
  const { Database } = await import("bun:sqlite");
  const db = new Database(dbPath);
  return {
    exec: (sql: string) => db.exec(sql),
    prepare: (sql: string) => db.prepare(sql),
    close: () => db.close(),
  };
}
