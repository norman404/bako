# BAKO.md

This document is Bako's living architecture guide and the single source of truth for architectural decisions. It is stated in the present tense because the code matches it: all ten modules are in the flat shape described below, and every rule here is enforceable against the tree as it stands.

## Product

Bako is a local-first desktop point-of-sale application for restaurants, cafeterias, and small businesses. The core application stays simple to develop: no plugin runtime, no permission model, no sandboxing — just cohesive internal modules.

> Simple, flat internal modules with one public entry point each.

Bako is not intended to become a collection of framework layers. Architecture exists to make changes safer and easier, not to make every feature look identical.

## Stack

- Tauri 2 + Rust
- React 19 + TypeScript
- Vite
- SQLite + Drizzle ORM
- TanStack Query
- Zustand 5
- Bun (>= 1.3)

## Quality bar

Every change is evaluated against:

- **Correctness:** important business rules and failure cases are explicit and testable.
- **Security:** external input, filesystem access, native commands, and database access are treated as trust boundaries even without a plugin system.
- **Maintainability:** prefer direct code and cohesive modules over abstraction without a concrete need.
- **Performance:** local-first workflows stay responsive; optional functionality avoids unnecessary startup cost.
- **UX:** POS workflows minimize steps, ambiguity, and failure states during active service.

### Verify before claiming done

This is the canonical gate list; other documents link here instead of restating it. The two groups are not equivalent — one is enforced for you, the other is not.

**CI gate** — `.github/workflows/ci.yml` runs exactly these three, in this order:

```bash
bun run lint        # oxlint
bun run build       # tsc + vite build — there is no `typecheck` script
cargo test --manifest-path src-tauri/Cargo.toml
```

**Local gate** — CI does **not** run this. Run it yourself whenever a change reaches `src-tauri/src/print/`:

```bash
cd src-tauri && cargo test --lib print::
```

Before a release, `.pi/skills/bako-release/SKILL.md` enforces `bun run lint` and `cargo test --manifest-path src-tauri/Cargo.toml` as a hard gate before any version file is touched.

## Conventions

- Imports use the `@/` alias; never a relative path across a module boundary (`../../modules/x`).
- File names are **kebab-case** (`use-updater.ts`, `order-drizzle.repository.ts`) — this is a deliberate divergence from terax's camelCase, kept because renaming every existing file would be pure churn with no behavioral gain. See `docs/architecture/module-system.md` §6.
- Commits follow Conventional Commits. **Never** add `Co-Authored-By` or other AI-attribution trailers.
- Default to no comments. Add one only when it explains a non-obvious _why_ — a workaround, an invariant, a constraint — never a _what_.
- `bun run <script>`, never bare `npm`/`npx`/`yarn`/`vitest`.

## Architecture

### Two-process model

The webview never touches SQLite, the filesystem, or printer hardware directly — everything goes through `invoke()` calls to commands registered in `src-tauri/src/lib.rs` and implemented in `src-tauri/src/commands.rs`:

| Command                    | Purpose                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `print_ticket`             | Print a sale receipt (ESC/POS).                                                                         |
| `print_command`            | Print a kitchen ticket — ESC/POS or a TSPL label, depending on the target printer.                      |
| `test_printer`             | Send a test page to a configured printer.                                                               |
| `list_usb_printers`        | Enumerate connected USB printers by device class/VID.                                                   |
| `validate_database`        | Check a candidate backup file's integrity and migration compatibility before restore.                   |
| `get_database_info`        | Report the path and size of the live `bako.db`.                                                         |
| `export_database`          | Snapshot `bako.db` to a user-chosen path.                                                               |
| `prepare_database_restore` | Stage a restore; Bako takes an internal backup of the current database first.                           |
| `restore_database`         | Swap in the validated backup; the app must restart to reopen the connection and run pending migrations. |

See `docs/architecture/printing.md` for how a print job reaches these commands from the frontend, `src-tauri/src/print/README.md` for the Rust engine behind them, and `docs/architecture/database.md` for the backup/restore flow.

### Project structure

```txt
src/
├── app/              App.tsx, workspaces and module registry — composition, not feature logic
├── components/       reusable UI (ui/ primitives + ColorInput)
├── db/                Drizzle client + schema
├── i18n/              i18n engine + locales/
├── lib/               generic utilities, FLAT, no subfolders
├── modules/           the feature modules (see below)
├── styles/
├── assets/
└── main.tsx
```

There is no `shared/` folder. It is the name that lets anything end up in it, so it does not exist: the Drizzle client and schema live in `db/`, the i18n engine and locales in `i18n/`, reusable UI in `components/`. Every folder is named after what it holds.

`src/lib/` is flat — `currency.ts`, `color.ts`, `utils.ts`, `platform.ts`, `app-version.ts`, `use-mount-effect.ts` — and stays that way. It holds small generic utilities, never a feature's code, and never subfolders.

The reasoning behind each destination — including what `src/shared/` held before it was retired — is in [`docs/architecture/module-system.md`](docs/architecture/module-system.md) §1.

### Module system

A module starts **completely flat** and only grows subfolders once its file count justifies them:

```txt
src/modules/<feature>/
├── index.ts              thin barrel — the ONLY public API
├── types.ts               module types
├── <feature>.ts           pure functions (functional core)
├── <feature>-store.ts     Zustand, if applicable
├── repository.ts          Drizzle access, if applicable
├── use-<feature>.ts       React Query hooks
├── manifest.ts            if the module registers application navigation
└── <Feature>Panel.tsx     components
```

`components/` and `lib/` are added only when a module's size justifies them — the product catalog needs them; a 3-file module doesn't.

#### Layers that do not exist in this model

`domain/`, `use-cases/`, `persistence/`, `adapters/`, `ports.ts`, `hooks/`, `store/`.

None of these reappear under a new name. A module needing a store names the file `<feature>-store.ts` at its root, not `store/index.ts`. This is the canonical list; every other document in the repo links here rather than restating it.

#### The barrel is the boundary

`import … from "@/modules/X/algo"` from outside `X` does not pass review. A module's only public entry point is its `index.ts` — imported as `@/modules/X`, never by a path that reaches inside. The only documented exception is `manifest.ts`, importable as `@/modules/X/manifest` **only** from `app/module-registry.ts`.

Nothing else reaches past a barrel, and any additional exception is a decision to be documented, not a call to make at the import site. The rationale for this exception and the `settings ↔ updater` import cycle it helped resolve are in [`docs/architecture/module-system.md`](docs/architecture/module-system.md).

### Database

`src/db/client.ts` is the only thing that talks to SQLite. It wraps `drizzle-orm/sqlite-proxy` around `@tauri-apps/plugin-sql`'s `Database.load("sqlite:bako.db")` connection.

Every operation — reads, writes, `closeDatabase()`, and everything inside `withTransaction()` — is funneled through `runExclusive()`, a hand-rolled promise chain backed by a module-level `databaseQueue: Promise<void>` (no mutex library involved). This exists because `withTransaction` issues raw `BEGIN`/`COMMIT`/`ROLLBACK` on the same shared connection every other query uses — without the queue, a concurrent query could execute inside another operation's transaction.

`src/db/schema.ts` declares the tables. Migrations run **exclusively** through Tauri (`tauri_plugin_sql`, registered in `src-tauri/src/lib.rs` as a `Vec<Migration>`); there is no TypeScript migration runner, and an applied migration is immutable. `src-tauri/migrations/` has a filename gap — `0003_payments.sql` jumps to `0005_system_settings.sql`, no `0004_*.sql` — but the registered `version` field is fully sequential with no gap; nothing in the codebase explains the missing filename, and the sequence must not be "fixed" by renumbering shipped files. Full detail in [`docs/architecture/database.md`](docs/architecture/database.md).

## Testing

Tests are kept in the Rust backend under `src-tauri/src`, usually in `#[cfg(test)]` modules next to the implementation. The frontend has no test suite.

Run the complete suite with `cargo test --manifest-path src-tauri/Cargo.toml`. Focused print tests can be run with:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --lib print::
```

Full conventions are in [`docs/contributing/testing.md`](docs/contributing/testing.md).

## Migration strategy

The migration to this structure is complete — all ten modules are flat, no layer folders remain under `src/modules/`, and `src/shared/` is deleted. The rules below are what keeps it that way; they govern every future change, not a one-time move.

1. New features use the flat module structure from day one. A module is never born with layer folders "to be flattened later".
2. Existing modules are simplified when meaningful work already touches them — not as a standalone refactor. Restructuring without a reason is churn with a rollback risk.
3. Remove architecture-only abstractions when they stop providing value.
4. Preserve behavior with tests during structural changes — an assertion changing means the change wasn't purely structural, and that is a different PR.
5. Per-module `README.md` files are retired — a module's description should not live in two places that can drift apart. The exception is `src-tauri/src/print/README.md`, which stays: it documents a different language and toolchain (Rust, `cargo test`), not a TypeScript module.

The step-by-step procedure for restructuring a module, plus the name-collision trap the migration hit when flattening, is in [`docs/architecture/module-system.md`](docs/architecture/module-system.md) §7.

## Dependency rules

- `modules/<feature>` owns feature-specific behavior.
- `components/` holds reusable application UI, not feature business logic.
- `lib/` holds small generic utilities with no feature ownership.
- `db/` and `i18n/` are single-owner app infrastructure — no feature module reimplements a database client or an i18n loader.
- A module never reaches into another module's files. Its public API is its `index.ts`, and that is the only entry point other modules import — if something a consumer needs isn't exported there, the fix is to export it, not to reach past it. The only documented exception is `manifest.ts`, importable only from `app/module-registry.ts`.

## Further reading

- [`docs/README.md`](docs/README.md) — index of contributor guides.
- [`docs/architecture/module-system.md`](docs/architecture/module-system.md) — project structure, module shape, the barrel rule and its `manifest.ts` exception, the `settings ↔ updater` cycle, and the procedure for restructuring a module.
- [`docs/architecture/database.md`](docs/architecture/database.md) — the serialization queue, schema, migrations.
- [`docs/architecture/printing.md`](docs/architecture/printing.md) — the frontend side of printing: which module owns what, the Tauri print commands, and how a job travels from a button click to a physical printer. It does **not** document the Rust engine — that is [`src-tauri/src/print/README.md`](src-tauri/src/print/README.md), kept next to the code because it covers a different language and toolchain.
- [`docs/contributing/testing.md`](docs/contributing/testing.md) — Rust test commands and conventions.
- [`docs/adr/README.md`](docs/adr/README.md) — accepted architectural decisions (prices in cents, error translation, TSPL bitmap rendering).
