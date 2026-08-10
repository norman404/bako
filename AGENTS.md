# Bako — Agent Guide

**Bako**: desktop POS — React 19, TypeScript, Tauri 2, Drizzle ORM + SQLite, Zustand 5, TanStack Query. Local-first UI, no routing, single screen.

> **Architecture:** [`BAKO.md`](BAKO.md) is the source of truth for architecture, module boundaries, and the plugin-free module system. If this file conflicts with `BAKO.md`, `BAKO.md` wins. Read it before making architectural changes.

---

## Testing

See [`BAKO.md`](BAKO.md) § Testing and [`docs/contributing/testing.md`](docs/contributing/testing.md) for the test strategy, runner setup, and the locale-completeness guard.

---

## ADRs

Hard-to-reverse architectural decisions live in `docs/adr/`. See [`docs/adr/README.md`](docs/adr/README.md) for the process, the format, the status lifecycle, and the current list.

---

## Database migrations

See [`BAKO.md`](BAKO.md) § Database and [`docs/architecture/database.md`](docs/architecture/database.md) for who owns migrations, the serialization queue, and the immutability invariant.

---

## Tooling: Bun

The project uses **Bun** (>=1.3) as package manager and as the runtime for frontend scripts. The test runner, the `bunfig.toml` rules, and the anti-patterns around both are in [`docs/contributing/testing.md`](docs/contributing/testing.md).

---

## Debugging production bugs

Don't assume DB or store state. Protocol: reproduce the bug with the user → request or add relevant logs → form a data-based hypothesis → write the fix → verify with regression tests when applicable.

---

## Tauri updater — signing and keys

The `pubkey` in `src-tauri/tauri.conf.json` gets compiled into the binary at build time; rotating it in the repo does not update existing installations.

- `TAURI_SIGNING_PRIVATE_KEY` and `pubkey` are not rotated without coordinating an update strategy.
- Any change to `pubkey` requires round-trip verification before publishing.

---

## Project skills

| Skill | Location | When it activates |
|---|---|---|
| `bako-release` | `.pi/skills/bako-release/SKILL.md` | Release request, build, version bump, or "cut a release". Hard gate before any version file is touched: the release subset of [`BAKO.md`](BAKO.md#verify-before-claiming-done) — everything in the CI gate except `bun run build`. |
