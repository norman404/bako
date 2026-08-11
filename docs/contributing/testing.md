# Testing

Bako keeps its test suite in the Rust backend. Frontend TypeScript and React tests are not part of the repository.

## Runner

The canonical command is:

```bash
bun run test
```

It delegates to:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Run focused printer tests with:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --lib print::
```

## Organization

Rust tests are normally embedded next to the implementation in `src-tauri/src`, guarded by `#[cfg(test)]`. This keeps unit tests close to the behavior they cover while allowing Cargo to run the complete backend suite.

Do not add a JavaScript test runner, frontend test files, or test-only Bun preload configuration. New backend behavior should include a Rust regression test when the behavior has meaningful correctness or regression risk.
