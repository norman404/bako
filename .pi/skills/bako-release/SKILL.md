---
name: bako-release
description: Create a new Bako release by bumping the version, committing, tagging, and pushing. Runs lint and tests first. Trigger when the user asks for a new release, new build, version bump, or cut a release.
---

# Bako Release

Create a new release for the Bako desktop POS. This is a **manual, gated workflow**: lint and tests must pass before any version files are touched.

## Preconditions

- You are inside the Bako repository root.
- The current branch is `main` (or the user explicitly asked for another branch).
- The working tree is clean. If it is not, stop and ask the user what to do.

## Workflow

### 1. Inspect current state

```bash
git status --porcelain
git branch --show-current
git tag -l | sort -V | tail -10
```

If the working tree is not clean, **STOP**. Report the modified files and ask the user.

### 2. Determine the next version

Bako uses a `YY.M.patch` scheme (e.g. `26.7.10`).

- Look at the latest tag and the versions in the files below.
- Bump **patch** by default unless the user explicitly asks for a different bump.
- If the month/year changed, adjust accordingly with the user's confirmation.

### 3. Run lint — HARD GATE

```bash
bun run lint
```

If lint fails, **STOP**. Report errors and do not continue. No version files may be modified until lint is green.

### 4. Run tests — HARD GATE

```bash
bun run test
bun run test:dom
```

If any test fails, **STOP**. Report failures and do not continue. Do not bump the version with failing tests.

### 5. Bump version files

Update exactly these files to the new version:

| File | Field to change |
|------|-----------------|
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version = "..."` under `[package]` |

Then update `Cargo.lock`:

```bash
cd src-tauri && cargo update -p bako
```

### 6. Verify the bump

```bash
grep -n "<new-version>" package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
rg "version = \"<new-version>\"" src-tauri/Cargo.lock
```

There should be **zero** occurrences of the old version in these four files.

### 7. Commit

```bash
git add -A
git commit -m "chore(release): v<new-version>"
```

The commit must contain **only** the version bump.

### 8. Tag

Create an annotated tag:

```bash
git tag -a v<new-version> -m "v<new-version>"
```

### 9. Push

```bash
git push
git push origin v<new-version>
```

### 10. Verify the release workflow

Pushing the tag `v*` triggers `.github/workflows/release.yml`. Confirm:

```bash
git log --oneline -3
git describe --tags --exact-match
```

Report that the GitHub Actions release build has started.

## Safety Rules

- **NEVER** bump the version if lint or tests fail.
- **NEVER** hand-edit `Cargo.lock`; use `cargo update -p bako`.
- **NEVER** touch the Tauri signing pubkey or `TAURI_SIGNING_PRIVATE_KEY`; those are unrelated to version bumps.
- **NEVER** create a lightweight tag; always use `git tag -a`.
- Keep the bump commit exclusive to version changes.

## Return Summary

```markdown
## Release Created

**Version**: v<new-version>
**Commit**: <hash>
**Tag**: v<new-version>

### Checks
- [x] Working tree clean
- [x] `bun run lint` passed
- [x] `bun run test` passed
- [x] `bun run test:dom` passed

### Files Changed
| File | Change |
|------|--------|
| `package.json` | version bumped |
| `src-tauri/tauri.conf.json` | version bumped |
| `src-tauri/Cargo.toml` | version bumped |
| `src-tauri/Cargo.lock` | updated via `cargo update -p bako` |

### Next Step
GitHub Actions is building the release. Monitor `.github/workflows/release.yml`.
```
