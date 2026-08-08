# Bako

A local-first desktop point-of-sale (POS) application for restaurants, cafeterias, and small businesses.

[![License](https://img.shields.io/badge/license-PolyForm%20Small%20Business-blue)](LICENSE)
[![Release](https://img.shields.io/github/v/release/norman404/bako)](https://github.com/norman404/bako/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/norman404/bako/ci.yml?branch=main&label=CI)](https://github.com/norman404/bako/actions)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![Bun](https://img.shields.io/badge/Bun-%3E%3D1.3-black)

Bako is a single-screen desktop POS built with **Tauri 2 + React 19 + TypeScript**. The UI runs on Vite and persists data locally in **SQLite** through `@tauri-apps/plugin-sql` and **Drizzle ORM**. No application backend is required for the core local workflow.

The project is moving toward a lightweight module architecture internally and a permission-aware SDK boundary for future external plugins. The SDK/plugin runtime is an architectural direction and is not yet a supported production plugin platform.

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
| Time & utilities | dayjs, lucide-react, clsx, tailwind-merge |
| Desktop | Tauri 2 |
| Local database | SQLite via `@tauri-apps/plugin-sql` |
| ORM | Drizzle ORM + drizzle-kit |
| Testing | Vitest + Testing Library |

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
| `bun run test` | Run tests (`bun:test` via `scripts/run-tests.ts`) |
| `bun run test:node` | Run unit tests (`.spec.ts`) |
| `bun run test:dom` | Run DOM tests (`.dom.spec.tsx` + happy-dom) |

### Development philosophy

- **Feature modules** — application behavior belongs with the feature that owns it.
- **Start simple** — modules start flat and introduce folders or abstractions only when they improve understanding.
- **Functional core, imperative shell** — business calculations and validation prefer pure functions; React, persistence, native commands, and other side effects stay near the edges.
- **Public module APIs** — `index.ts` provides a clear boundary for code consumed by other modules.
- **Behavior-focused testing** — protect business rules, regressions, persistence behavior, and security invariants rather than testing architecture for its own sake.

[`BAKO.md`](BAKO.md) is the living architecture document and source of truth for the new direction. Existing code is expected to migrate incrementally rather than through a wholesale rewrite.

---

## Architecture

### Internal modules

New and refactored features live under `src/modules/<feature>` and should use the smallest useful structure.

```txt
src/modules/delivery/
├── index.ts
├── types.ts
├── delivery-service.ts
├── delivery-store.ts
├── DeliveryPanel.tsx
└── delivery-service.test.ts
```

Larger modules can introduce `components/`, `lib/`, or other cohesive subdirectories when needed. `domain/`, `use-cases/`, `repositories/`, and infrastructure layers are no longer required by default.

### Application composition

`src/app` composes modules and global providers. Cross-cutting platform infrastructure belongs in a small `core` surface rather than inside arbitrary feature modules.

The intended direction is:

```txt
src/
├── app/
├── core/
│   ├── db/
│   ├── events/
│   ├── plugins/
│   └── sdk/
├── components/
├── modules/
├── lib/
└── main.tsx
```

This is a target structure. Existing code does not need to move until there is a useful reason to touch it.

### External plugins: planned

Bako is being designed so future external modules can be authored with standard web technologies and communicate with the application through a versioned Bako SDK.

External plugins are different from trusted internal modules. They will not receive direct access to application stores, SQLite/Drizzle, or arbitrary Tauri commands.

Conceptually:

```txt
Plugin (HTML/CSS/JS)
        │
        ▼
     Bako SDK
        │
        ▼
Permissions + validation
        │
        ▼
Bako capabilities
```

The plugin manifest, SDK API, isolation mechanism, permission runtime, package signing, and distribution model are still under design. See [`BAKO.md`](BAKO.md) for the current architectural proposal.

### Local database

Bako uses a local SQLite database named `bako.db`. Migrations are executed by Tauri at application startup. The database remains application infrastructure; future external plugins must use supported SDK capabilities rather than raw SQL access.

---

## Security direction

The future plugin system is designed around **default deny** and narrow capabilities.

Planned security invariants include:

- external plugins cannot access SQLite directly;
- external plugins cannot invoke arbitrary Tauri commands;
- capabilities are granted through explicit permissions;
- privileged native operations validate authorization and input on the Rust side;
- filesystem and network access are restricted by default;
- Bako-owned credentials are never exposed to plugin JavaScript;
- financial mutations use dedicated business operations rather than generic record updates;
- security-sensitive plugin actions can be attributed to a plugin identity/version.

For the complete security and trust-boundary proposal, including permissions, filesystem/network access, secrets, UI isolation, financial operations, auditing, and plugin installation, read [`BAKO.md`](BAKO.md).

---

## Testing

```bash
bun run test
bun run test:dom
```

Tests are co-located when practical. Prioritize business calculations, validation, payment/order invariants, regressions, migrations, and security boundaries. Pure functions should remain inexpensive to test.

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
