# Testing

[`BAKO.md`](../../BAKO.md#testing) is the canonical test policy. This guide explains how to run and place the two executable suites.

## Commands

```bash
bun run test          # focused TypeScript contract tests under src/
bun run test:watch    # same suite in watch mode
cargo test --manifest-path src-tauri/Cargo.toml
```

Run focused printer tests when changing `src-tauri/src/print/`:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --lib print::
```

Use `bun run <script>` rather than invoking Vitest directly. The scripts explicitly run Vitest under Bun rather than delegating its Node shebang.

## Frontend tests

Frontend test files use the `*.test.ts` convention and are discovered from `src/`. The `src/` boundary deliberately excludes archived OpenSpec acceptance files that use `bun:test`.

- Co-locate a test beside the pure function or orchestration it covers.
- Import `describe`, `it`, and `expect` from `vitest`.
- Use local typed fixtures and assert the caller-visible result, not implementation details.
- Cover the happy path and the meaningful boundary, error, or rejection path.
- Keep browser, DOM, snapshot, hardware, and running-Tauri dependencies out of this suite.

When a boundary cannot be exercised without native runtime behavior, keep the test in Rust or isolate the boundary behind a port; do not simulate hardware in a frontend unit test.

## Choosing the layer

| Behavior | Test layer |
|---|---|
| Pure TypeScript calculation, validation, or state transition | Vitest unit test |
| Tauri command validation, SQLite, migration, backup/restore, or printing | Rust test next to the implementation |
| Layout, styles, themes, static copy, or compiler-guaranteed typing | Manual review and lint/build as appropriate |

The mandatory categories for a regression test — money, integrity/recovery, native trust boundaries, and broad-risk bugs — are defined in [`BAKO.md`](../../BAKO.md#testing). A production bug should ship with the smallest test that would have caught its original failure.
