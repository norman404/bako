# Bako contributor documentation

This is a navigation index for Bako's contributor guides. [`BAKO.md`](../BAKO.md), at the repo root, is the authoritative architecture document. These guides elaborate on it — if any guide here conflicts with `BAKO.md`, `BAKO.md` wins.

## How these documents relate

| Document | Role |
|---|---|
| [`BAKO.md`](../BAKO.md) | **Canonical.** Defines the rules of the target architecture, stated in the present tense — "a module is flat", not "a module will be flat". Each rule is defined here exactly once. |
| `docs/architecture/*.md`, `docs/contributing/*.md` | **Elaborate.** Edge cases, exceptions, mechanism read from the code, and the procedure for restructuring toward a rule. They never redefine a rule. |
| [`docs/adr/`](adr/README.md) | **Hard-to-reverse decisions.** Once an ADR is `Accepted` it is not rewritten to change the decision — a new ADR supersedes it. |

**Operating rule: if a rule is stated in full in two files, one of them is wrong.** A guide links to the canonical statement instead of restating it — the command gate lives in [`BAKO.md` § Verify before claiming done](../BAKO.md#verify-before-claiming-done), and the list of layers this architecture does not have lives in [`BAKO.md` § Layers that do not exist in this model](../BAKO.md#layers-that-do-not-exist-in-this-model).

## Language

The split is deliberate; do not translate a document into the other language while editing it.

| Scope | Language |
|---|---|
| Repo root (`BAKO.md`, `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`) | English |
| [`docs/architecture/`](architecture/) and [`docs/contributing/`](contributing/) | English |
| [`docs/adr/`](adr/README.md) | Spanish |
| [`docs/database-backups.md`](database-backups.md) | Spanish |

## Architecture

- [Module system](architecture/module-system.md) — the flat module shape, where each top-level folder's contents belong, the barrel rule and its `manifest.ts` exception, the `settings ↔ updater` import cycle, and the procedure for restructuring a module.
- [Database](architecture/database.md) — the SQLite client's serialization queue, the schema, and the Tauri-only migration flow.
- [Printing](architecture/printing.md) — what a frontend contributor needs before touching a print call: which module owns what, which Tauri commands exist, and how a print job travels from a button click to a physical printer. The Rust engine is documented separately, in [`src-tauri/src/print/README.md`](../src-tauri/src/print/README.md).

## Contributing

- [Testing](contributing/testing.md) — focused frontend and Rust test commands and conventions.

## Architecture decisions

- [ADRs](adr/README.md) — hard-to-reverse decisions (prices in integer cents, domain-error translation, TSPL bitmap rendering) that are not rewritten once accepted.

## Other guides

- [Database backups](database-backups.md) — the export/restore flow exposed in Settings.
