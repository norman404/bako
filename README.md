# Bako

A desktop point-of-sale (POS) application for cafeterias and small businesses.

[![License](https://img.shields.io/badge/license-PolyForm%20Small%20Business-blue)](LICENSE)
[![Release](https://img.shields.io/github/v/release/norman404/bako)](https://github.com/norman404/bako/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/norman404/bako/ci.yml?branch=main&label=CI)](https://github.com/norman404/bako/actions)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-orange)

Bako is a local-first, single-screen desktop POS built with **Tauri 2 + React 19 + TypeScript**. The UI runs on Vite and persists data locally in **SQLite** through `@tauri-apps/plugin-sql` and **Drizzle ORM**. No routing, no backend — everything runs on the machine where it's installed.

> **Note:** The checkout flow is local-only; it does not integrate a real payment gateway.

---

## Screenshots

<!-- Add screenshots here -->

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

| Layer            | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| Frontend         | React 19, TypeScript, Vite 7                               |
| UI               | Tailwind CSS 4, Radix UI, local components in `src/shared/components/ui` |
| State & data     | TanStack Query, Zustand, neverthrow                         |
| Time & utilities | dayjs, lucide-react, clsx, tailwind-merge                   |
| Desktop          | Tauri 2                                                     |
| Local database   | SQLite via `@tauri-apps/plugin-sql`                        |
| ORM              | Drizzle ORM + drizzle-kit                                   |
| Testing          | Vitest + Testing Library                                    |

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
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
pnpm install

# Run in development (web only)
pnpm dev

# Run as desktop app (Tauri)
pnpm tauri dev
```

> **Versioning:** Bako releases use CalVer `YY.M.x` (two-digit year.month.release-of-the-month), tagged as `vYY.M.x`.

---

## Development

### Scripts

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `pnpm dev`           | Start Vite dev server (web only)             |
| `pnpm build`         | Type-check and build for production (`tsc` + `vite build`) |
| `pnpm preview`       | Preview the production build locally         |
| `pnpm tauri dev`     | Run as a Tauri desktop app (development)     |
| `pnpm tauri build`   | Build the desktop app for production         |
| `pnpm test`          | Run unit tests (Vitest)                      |
| `pnpm test:dom`      | Run DOM tests (Testing Library + jsdom)     |

### Workflow

- **TDD** — every change follows the **Red-Green-Refactor** cycle: write the failing test first, then the minimum code to pass it, then refactor.
- **Clean Architecture** — the codebase is organized by feature (vertical slices), keeping the domain independent of frameworks and persistence.
- See [`AGENTS.md`](AGENTS.md) for the full architecture guide, module conventions, and the canonical reference module (`menu`).

---

## Architecture

### Clean Architecture by module

Each module in `src/modules/` is a self-contained vertical slice with internal layers. Dependencies always point inward — the domain never imports from persistence, hooks, or components.

```
domain/ (entities + ports) ← use-cases ← persistence
                                 ↑
                               hooks  (inject persistence, call use-cases)
                                 ↑
                             components  (UI only, receive callbacks)
```

See [`AGENTS.md`](AGENTS.md) for the detailed layering rules and the `menu` module reference.

### Plugin/Registry pattern

Each module is autonomous. To appear in the settings panel, it declares its own `manifest.ts`:

```typescript
// modules/my-module/manifest.ts
export const myModuleManifest: ModuleManifest = {
  id: "my-module",
  flagKey: "my_module_enabled", // optional — toggles the module via a feature flag
  settingsPanel: MyPanel,        // optional — settings screen
  settingsLabel: "My Module",
  settingsIcon: SomeIcon,
};
```

Then it is registered in `src/app/module-registry.ts`. `SettingsModal` knows nothing about any module — it iterates the registry dynamically.

### Directory structure

```txt
src/
├── app/
│   ├── App.tsx
│   └── module-registry.ts        ← central module registry
├── modules/
│   ├── checkout/
│   │   └── manifest.ts           ← module manifest
│   ├── feature-flags/
│   ├── menu/
│   │   └── manifest.ts
│   ├── order/
│   └── settings/
│       └── domain/
│           └── module-manifest.ts ← ModuleManifest contract
├── shared/
│   ├── db/                       ← Drizzle client and schema
│   ├── stores/                   ← global UI Zustand stores
│   └── i18n/
└── main.tsx

src-tauri/
├── migrations/                   ← SQLite migrations (immutable once applied)
├── src/
├── Cargo.toml
└── tauri.conf.json
```

### Local database

Bako uses a local SQLite database named `bako.db`, initialized in `src/shared/db/`. Migrations are executed **exclusively by Tauri** at app startup (see `src-tauri/src/lib.rs`) — there is no JavaScript/TypeScript migration runner.

---

## Testing

```bash
pnpm test       # unit tests
pnpm test:dom   # DOM tests
```

Tests are co-located with their implementation. Domain logic and use-cases are the easiest to test — they are pure functions with no React or database dependencies.

---

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines on setup, commit conventions, and the TDD workflow, and adhere to the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) in all interactions.

---

## License

Bako is source-available under the [PolyForm Small Business License 1.0.0](LICENSE).

- **Small businesses** (< $1M USD annual revenue, < 100 employees): **Free** for commercial use
- **Personal, educational, and noncommercial use:** Free
- **Larger businesses** ($1M+ USD annual revenue): Require a [commercial license](mailto:norman.torres.mx@gmail.com)

See [LICENSE](LICENSE) for full terms.

---

## Acknowledgments

- Bako was migrated from a previous private monorepo into a standalone Tauri project, adapting the bootstrap and relevant code from Preact to React 19.
- Built with [Tauri](https://tauri.app/), [React](https://react.dev/), [Drizzle ORM](https://orm.drizzle.team/), [Zustand](https://github.com/pmndrs/zustand), and [TanStack Query](https://tanstack.com/query).