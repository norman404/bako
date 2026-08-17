# Bako

A local-first desktop point-of-sale (POS) application for restaurants, cafeterias, and small businesses.

[![License](https://img.shields.io/badge/license-PolyForm%20Small%20Business-blue)](LICENSE)
[![Release](https://img.shields.io/github/v/release/norman404/bako)](https://github.com/norman404/bako/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/norman404/bako/ci.yml?branch=main&label=CI)](https://github.com/norman404/bako/actions)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![Bun](https://img.shields.io/badge/Bun-%3E%3D1.3-black)

Bako is a single-screen desktop POS built with **Tauri 2 + React 19 + TypeScript**. The UI runs on Vite and persists data locally in **SQLite** through `@tauri-apps/plugin-sql` and **Drizzle ORM**. No application backend is required for the core local workflow.

The project is moving toward a flat, feature-oriented module architecture internally, with [`BAKO.md`](BAKO.md) as the living architecture document.

> **Note:** The checkout flow is local-only; it does not integrate a real payment gateway.

---

## Features

- **Menu category navigation** — browse products grouped by category.
- **Product grid** — visual cards with product details and pricing.
- **Cart** — increase or decrease item quantities.
- **Checkout** — cash or card payment selection.
- **Customer management** — track delivery customers.
- **Configuration** — manage products and categories from the settings panel.
- **Shift summary** — end-of-shift overview.
- **Local persistence** — SQLite database initialized automatically on app startup.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7 |
| UI | Tailwind CSS 4, Radix UI, local components |
| State & data | TanStack Query, Zustand, neverthrow |
| Time & utilities | lucide-react, clsx, tailwind-merge |
| Desktop | Tauri 2 |
| Local database | SQLite via `@tauri-apps/plugin-sql` |
| ORM | Drizzle ORM + drizzle-kit |
| Testing | Rust `cargo test` |

---

## Prerequisites

- **Node.js** 20+
- **Bun** 1.3+
- **Rust** stable (install via [rustup](https://rustup.rs/))

### OS-specific requirements

**macOS**

- Xcode Command Line Tools (`xcode-select --install`)

**Linux (Debian/Ubuntu)**

```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**Windows**

- Microsoft C++ Build Tools
- WebView2 (preinstalled on Windows 10/11)

---

## Getting Started

```bash
# Clone
git clone https://github.com/norman404/bako.git
cd bako

# Install dependencies
bun install

# Run in development (web only)
bun run dev

# Run as desktop app (Tauri)
bun run tauri dev
```

> **Versioning:** Bako releases use CalVer `YY.M.x` (two-digit year.month.release-of-the-month), tagged as `vYY.M.x`.

---

## Development

### Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start Vite dev server (web only) |
| `bun run build` | Type-check and build for production (`tsc` + `vite build`) |
| `bun run preview` | Preview the production build locally |
| `bun run tauri dev` | Run as a Tauri desktop app (development) |
| `bun run tauri build` | Build the desktop app for production |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run Rust tests |

### Development philosophy

- **Feature modules** — application behavior belongs with the feature that owns it.
- **Start simple** — modules start flat and introduce folders or abstractions only when they improve understanding.
- **Functional core, imperative shell** — business calculations and validation prefer pure functions; React, persistence, native commands, and other side effects stay near the edges.
- **Public module APIs** — `index.ts` provides a clear boundary for code consumed by other modules.
- **Behavior-focused testing** — protect business rules, regressions, persistence behavior, and security invariants rather than testing architecture for its own sake.

[`BAKO.md`](BAKO.md) is the living architecture document and source of truth. The codebase matches it: every feature module is flat, with `index.ts` as its only public entry point.

---

## Architecture

### Internal modules

Features live under `src/modules/<feature>` and use the smallest useful structure.

```txt
src/modules/<feature>/
├── index.ts
├── types.ts
├── <feature>.ts
├── <feature>-store.ts
├── repository.ts
├── use-<feature>.ts
├── manifest.ts
└── <Feature>Panel.tsx
```

Larger modules can introduce `components/`, `lib/`, or other cohesive subdirectories when needed. The layers this model does not bring back are listed in [`BAKO.md`](BAKO.md#layers-that-do-not-exist-in-this-model).

### Application composition

`src/app` composes modules and global providers — composition only, no business logic.

The top-level structure is:

```txt
src/
├── app/
├── components/
├── db/
├── i18n/
├── lib/
├── modules/
├── styles/
├── assets/
└── main.tsx
```

There is no `shared/` folder. It is the name that lets anything end up in it, so it does not exist: the Drizzle client and schema live in `db/`, the i18n engine and locales in `i18n/`, reusable UI in `components/`. Every folder is named after what it holds.

### Local database

Bako uses a local SQLite database named `bako.db`. How migrations run and the rules that govern them are in [`BAKO.md`](BAKO.md#database).

---

## Testing

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Rust tests are kept next to the implementation under `src-tauri/src`. The frontend has no test suite.

---

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup and contribution guidelines and [`BAKO.md`](BAKO.md) before making architectural changes. Follow the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) in all interactions.

---

## License

Bako is source-available under the [PolyForm Small Business License 1.0.0](LICENSE).

- **Small businesses** (< $1M USD annual revenue, < 100 employees): **Free** for commercial use
- **Personal, educational, and noncommercial use:** Free
- **Larger businesses** ($1M+ USD annual revenue): Require a commercial license

See [LICENSE](LICENSE) for full terms.

---

## Acknowledgments

Bako was migrated from a previous private monorepo into a standalone Tauri project, adapting the bootstrap and relevant code from Preact to React 19.
