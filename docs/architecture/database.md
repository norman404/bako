# Database

This guide elaborates on [`BAKO.md`](../../BAKO.md). If anything here conflicts with `BAKO.md`, `BAKO.md` wins.

## Client (`src/db/client.ts`)

The frontend never talks to SQLite directly. It goes through
`drizzle-orm/sqlite-proxy`, wired to `@tauri-apps/plugin-sql`'s `Database.load("sqlite:bako.db")`
connection. Drizzle only shapes queries and results; the actual SQL execution is a
proxy function (`executeSql`) that forwards `run` / `all` / `values` / `get` calls to
the Tauri SQL plugin over IPC.

### Serialization: `runExclusive` + `databaseQueue`

All database access — reads, writes, `closeDatabase()`, and every operation inside
`withTransaction()` — is funneled through a single function:

```ts
function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const scheduledOperation = databaseQueue.catch(() => undefined).then(operation);
  databaseQueue = scheduledOperation.then(() => undefined, () => undefined);
  return scheduledOperation;
}
```

`databaseQueue` is a module-level `Promise<void>` that each call chains onto. There is
no mutex library and no `Mutex`/semaphore type involved — it's a hand-rolled promise
chain that guarantees at most one operation is in flight against the shared SQLite
connection at any time, in call order.

This exists because `withTransaction()` issues raw `BEGIN` / `COMMIT` / `ROLLBACK`
statements on the **same shared connection** (`sqlClient`) that every other query
uses. There is no per-transaction connection or driver-level locking. Without
`runExclusive` serializing every call, a second concurrent query could execute
between another operation's `BEGIN` and `COMMIT` on that same connection, corrupting
the transaction or interleaving unrelated statements inside it. The queue is what
makes `withTransaction` safe to use at all.

### Exports

- `db` — the Drizzle instance, created via `createDatabase(execute)`, where every
  `execute` call is wrapped in `runExclusive`.
- `initDatabase()` — opens the Tauri SQL connection (`getSqlClient()`). Called once
  from `src/main.tsx` at startup.
- `closeDatabase()` — closes the connection through `runExclusive`; used by the database
  backup/restore flow in `settings` before swapping the `bako.db` file.
- `withTransaction(operation)` — runs `operation` inside `BEGIN`/`COMMIT`/`ROLLBACK`,
  itself wrapped in `runExclusive`. Used today by the data access in `checkout` and in
  `shift-reports`.
- `DatabaseClient` — the type of `db`, used to type transaction callbacks.

## Schema (`src/db/schema.ts`)

The tables, all declared with `sqliteTable(...)`:

`menus`, `categories`, `products`, `productMenus`, `modifierGroups`, `modifierOptions`,
`categoryModifierGroups`, `productModifierGroups`, `orderItemModifiers`,
`customers`, `shifts`, `orders`, `payments`, `cashMovements`, `orderItems`,
`printers`, `systemSettings`, `featureFlags`.

The historical `delivery_persons` table and `orders.delivery_person_id` column remain in
existing databases because migration `0010_delivery_persons.sql` is immutable; they are
not declared in the active TypeScript schema.

Prices and money fields (`price`, `priceDelta`, `total`, `amount`, `unitPrice`,
`openingCash`, `countedCash`, `cashDifference`) are `integer` columns — see
[ADR-0001](../adr/0001-prices-in-cents.md) for why cents are stored as whole
integers rather than floats.

## Migrations — Tauri-only

Migrations are registered exclusively in `src-tauri/src/lib.rs`, inside `run()`, as a
`Vec<Migration>` passed to `tauri_plugin_sql::Builder::default().add_migrations(DATABASE_URL, migrations)`.
Each `Migration` entry has a sequential `version` field (1 through
`CURRENT_MIGRATION_VERSION`) and its SQL body pulled in with
`include_str!("../migrations/NNNN_name.sql")`. There is no TypeScript migration
runner — `tauri_plugin_sql` applies these against `bako.db` on app startup.

**Filename gap:** in `src-tauri/migrations/`, the numbering jumps from
`0003_payments.sql` straight to `0005_system_settings.sql` — there is no
`0004_*.sql` file. This is a gap in the **filename** sequence only: the `version`
field registered in `lib.rs` is fully sequential, no gap — `version: 4` maps to
`0003_payments.sql` and `version: 5` maps to `0005_system_settings.sql` directly.
No migration was skipped or reverted at the applied-version level.
`src-tauri/src/database_migrations.rs` (a startup compatibility-repair plugin for
the printer-label-orientation migration's `_sqlx_migrations` history) does not
reference or explain the missing `0004` filename. Nothing in the codebase explains
why that number was skipped — the gap is confirmed to exist, and the cause is not
documented. **Do not "fix" the sequence** by renumbering existing files or
inserting a new `0004_*.sql`; a migration already applied is immutable (see
invariant below) and renumbering shipped files corrupts the history of existing
installs.

## Seeding outside Tauri: `scripts/adapters/bun-sqlite.connection.ts`

This adapter is unrelated to migrations. It opens a direct `bun:sqlite` connection
to an **already-migrated** `bako.db` file (located via the OS-specific app-data path
in `scripts/seed.ts`) and exposes the minimal `exec` / `prepare` / `close` surface
`scripts/seed.ts` needs to run `src-tauri/seeds/seed-menu.sql` from the CLI
(`bun run seed`). It bypasses Drizzle and the Tauri SQL plugin entirely — it's a
one-off seeding tool, not a second database client for the app.

## Invariant

Migrations run **only** through Tauri and an applied migration is immutable — the rule
is stated in [`BAKO.md` § Database](../../BAKO.md#database) and is not restated here. In
practice: a schema change is a **new** `.sql` file with the next sequential number plus
its `Migration` entry in `lib.rs`. A file that has already shipped is never edited,
renumbered, or deleted, because installs in the field have already applied it.

## See also

- [`../database-backups.md`](../database-backups.md) — export/restore flow for `bako.db`.
- [ADR-0001 — Prices in integer cents](../adr/0001-prices-in-cents.md).
