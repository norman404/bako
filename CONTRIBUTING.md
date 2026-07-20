# Contributing to Bako

Thanks for your interest in contributing to Bako! This is a source-available project, and contributions of all kinds are welcome — bug fixes, features, docs, tests.

Before you start, please read our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating you agree to uphold it.

> **License heads-up:** Bako is licensed under the [PolyForm Small Business License 1.0.0](./LICENSE) — **not** an OSI-approved open source license. Small businesses (< $1M USD revenue, < 100 employees), personal, educational, and noncommercial use are free; larger commercial use requires a separate license. See the [License](#license) section below for what this means for your contributions.

---

## Prerequisites

You'll need these installed before you can build and run Bako:

| Tool | Version | Notes |
| --- | --- | --- |
| **Node.js** | `20+` | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions |
| **Bun** | `1.3+` | `curl -fsSL https://bun.sh/install \| bash` — see [bun.sh](https://bun.sh) |
| **Rust** | `stable` | Install via [rustup](https://rustup.rs/) — required by Tauri |
| **Git** | any recent | |

### OS-specific dependencies (Tauri 2)

Bako is a Tauri 2 desktop app, so the Rust toolchain needs native GUI bindings:

**macOS**
```bash
xcode-select --install        # Xcode Command Line Tools
# Rust via rustup, plus CLang (bundled with Xcode/CLT)
```

**Linux (Debian/Ubuntu)**
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential curl wget file
```

**Windows**
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on Windows 11)
- Rust via rustup

See the [Tauri 2 prerequisites guide](https://v2.tauri.app/start/prerequisites/) for full details.

---

## Getting Started

```bash
# 1. Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/bako.git
cd bako

# 2. Install JS dependencies
bun install

# 3. Run the full desktop app (compiles Rust + boots Vite)
bun run tauri dev
```

The first `bun run tauri dev` will take a while because it compiles the Rust backend. Subsequent runs are much faster.

Want just the web dev server (no Tauri shell)? `bun run dev` boots Vite alone — useful for pure UI work, but any feature that hits SQLite or native APIs won't work in that mode.

---

## Development

| Command | What it does |
| --- | --- |
| `bun run dev` | Vite dev server only (no Tauri/native APIs) |
| `bun run tauri dev` | Full desktop app — **recommended for feature work** |
| `bun run build` | Production build (`tsc` + `vite build`) |
| `bun run test` | Unit tests via Vitest |
| `bun run test:dom` | DOM tests via `@testing-library/react` |

Bako uses **oxlint** as its linter — run `bun run lint` before opening a PR. There is no formatter configured yet, so follow the style of surrounding code, and run `bun run build` to catch type errors.

---

## Testing

Tests are **co-located** with the implementation they cover, not in a separate `tests/` tree.

### Naming conventions

| File | Purpose |
| --- | --- |
| `*.spec.ts` | Unit test (pure logic — domain, use-cases, lib) |
| `*.dom.spec.tsx` | DOM test using `@testing-library/react` (components, hooks with UI) |

DOM tests use `@testing-library/react` with `happy-dom` (registered globally via `bunfig.toml` → `src/test/setup-bun.ts`). The runner `scripts/run-tests.ts` executes each spec in its own `bun test` process to keep `mock.module()` isolated between files.

### Targeting a single spec during TDD

```bash
# Run a single unit spec
bun test src/modules/menu/domain/product.spec.ts

# Run a single DOM spec
bun test src/modules/menu/components/ProductGrid.dom.spec.tsx
```

> ⚠️ Usa `bun run test`, NUNCA `bun test` — `bun test` invoca el test runner nativo de Bun sobre los specs de Vitest y falla. Los tests corren deliberadamente bajo Node (Vitest no soporta el runtime de Bun — bug [oven-sh/bun#27002](https://github.com/oven-sh/bun/issues/27002)), por lo que Node ≥20.19 sigue siendo requisito local para correr tests aunque ya no esté en `engines`.

---

## Project Architecture

Bako follows **Clean Architecture organized by feature**, not by layer. Each module in `src/modules/<feature>/` is a vertical slice with its own internal layers.

```
domain/       ← entities + ports (pure, no framework deps)
use-cases/    ← pure functions that take a port, return ResultAsync
persistence/  ← port implementations (Drizzle + SQLite)
hooks/        ← DI + React Query/Zustand binding, no business logic
components/   ← pure UI, receive props + callbacks only
```

### Dependency rule (enforced, not optional)

Dependencies point **inward only**. Never the other way.

```
domain ← use-cases ← persistence
                      ↑
                    hooks
                      ↑
                  components
```

- `domain/` imports nothing from the project (only `src/lib/` and `neverthrow`).
- `components/` never import a repository or a use-case directly — they go through hooks.
- `ports.ts` always lives at `domain/ports.ts`, never at the module root.

The `menu` module (`src/modules/menu/`) is the reference implementation — read it when in doubt.

> For the full rules, signals of breakage, and the canonical module structure, see [`AGENTS.md`](./AGENTS.md). It's the authoritative architecture guide.

## Error handling pattern

Domain errors should never be shown to users as raw `error.message` strings. The
`domain/` and `persistence/` layers are framework-agnostic and therefore cannot
use `react-i18next`.

When an error type has a user-facing meaning, give it a translatable `code` and
`params` in `domain/{feature}/errors.ts` (see `src/modules/menu/domain/errors.ts`
for the reference shape). Then:

1. Create or update `src/modules/{feature}/lib/translate-{feature}-error.ts` to
   map the code to an i18n key under `errors:{feature}.{code}`.
2. Add the key and value to `src/shared/i18n/locales/*/{feature}.json` (or
   `errors.json`) for all supported locales.
3. Use the helper in components instead of `error.message`:
   ```tsx
   const { t } = useTranslation(["settings", "errors"]);
   // ...
   setFormError(translateMenuError(error, t));
   ```

Non-domain errors (native `Error`, library exceptions, unmapped domain errors)
fallback to a generic localized message so users never see raw English stack
traces. See [ADR-0002](./docs/adr/0002-domain-error-translation.md) for the full
rationale.

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). Keep the subject line short, imperative mood, lowercase after the type.

### Types

| Type | Use for |
| --- | --- |
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `docs` | Documentation only |
| `test` | Adding or correcting tests |
| `chore` | Tooling, deps, config, CI |
| `style` | Formatting, whitespace (no logic change) |

### Examples

```
feat(checkout): add cancel order use-case
fix(menu): filter products by category case-insensitively
refactor(order): extract price calculation to domain
docs: add CONTRIBUTING.md
chore: bump tauri to 2.1.0
test(feature-flags): cover optimistic update rollback
```

### Scope

Use the module name as scope when the change is scoped to a module: `feat(menu):`, `fix(checkout):`. Omit scope for cross-cutting changes.

### AI attribution

**Do not** add `Co-Authored-By` trailers, `Generated with Claude` lines, or any other AI-attribution footers to commits. Conventional commit messages only.

---

## Versioning

Bako uses **CalVer**: `YY.M.x` — two-digit year, month, and release-of-the-month, with no leading zeros (semver tooling rejects them; Windows MSI also caps the major version at 255, which rules out four-digit years). Release tags follow the same scheme prefixed with `v`, e.g. `v26.7.1`.

---

## Pull Requests

### Branch naming

Prefix the branch with the type, matching the commit type:

```
feat/<short-description>      # e.g. feat/cancel-order
fix/<short-description>      # e.g. fix/menu-category-filter
chore/<short-description>    # e.g. chore/upgrade-tauri
docs/<short-description>
refactor/<short-description>
```

### Before opening a PR

- [ ] `bun run build` passes (no type errors)
- [ ] `bun run test` and `bun run test:dom` pass
- [ ] New behavior is covered by tests written **first** (Red phase observed)
- [ ] Commits follow Conventional Commits, no AI-attribution trailers
- [ ] No unrelated formatting churn

### PR description

Include:

- **What** — what the PR does, in one or two sentences
- **Why** — the motivation / problem being solved
- **How** — the approach, especially if non-obvious
- **Testing** — how you verified it (which specs, manual steps)
- **Breaking changes** — if any, call them out explicitly

### Review & merge

- One approval required for non-trivial changes.
- We use **squash merge** — the PR title becomes the squashed commit message, so write it in Conventional Commits format.
- Keep PRs focused. One concern per PR. If you're touching three modules, consider three PRs.

---

## Reporting Bugs

Use the [GitHub issue tracker](https://github.com/norman404/bako/issues/new?template=bug_report.yml). The template will guide you through providing:

- **Bako version** (found in *Settings → About* or `Cargo.toml`)
- **OS and version** (macOS / Linux distro / Windows build)
- **Steps to reproduce** — numbered, minimal
- **Expected vs. actual behavior**
- **Logs / screenshots** — Tauri logs live in the dev console (`bun run tauri dev`) or the OS log directory in production

The more reproducible, the faster we can triage.

---

## Feature Requests

Open a [GitHub issue](https://github.com/norman404/bako/issues/new?template=feature_request.yml) labeled `enhancement`. Tell us:

- The problem you're trying to solve (not just the solution you imagine)
- Who benefits and when
- Any alternatives you've considered

For larger features, expect a discussion before implementation — we may ask you to write it up as a proposal first so we can align on scope and architecture before code is written.

---

## License

By contributing, you agree that your contributions will be licensed under the [PolyForm Small Business License 1.0.0](./LICENSE) that covers the project. You retain copyright to your contributions; you grant norman404 the right to use and redistribute them under that license.

Because the PolyForm Small Business License is **not** OSI-approved open source, commercial use of Bako by larger businesses ($1M+ USD annual revenue) requires a separate commercial license from the maintainer. Small businesses, personal, educational, and noncommercial use remain free. If that's a concern for your contribution, raise it in the PR before you start work.

---

## Questions

- **Architecture & internals** — read [`AGENTS.md`](./AGENTS.md) and the per-module `README.md` files under `src/modules/`.
- **General questions** — [GitHub Discussions](https://github.com/norman404/bako/discussions) (if enabled) or open an issue with the `question` label.
- **Security-sensitive issues** — do **not** open a public issue. Email the maintainer directly at [norman.torres.mx@gmail.com](mailto:norman.torres.mx@gmail.com).

Happy hacking. 🛠️