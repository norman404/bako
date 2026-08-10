# Migration status — temporary

> **This file is a snapshot, not a rule.** It records where Bako's code stands *today*, mid-migration, so a future change has a number to move and a way to tell whether it moved. It defines nothing. The rules — the target structure, the barrel boundary, the layers that no longer exist — live in [`BAKO.md`](../../BAKO.md), and `BAKO.md` wins on every disagreement.
>
> **Delete this file when the migration is finished.** Nothing else should ever come to depend on it.

---

## Baseline (measured 2026-08-09)

Figures below are a measurement taken on a specific day, not a permanent property of the codebase. Re-measure before quoting them.

- **399 source files on disk** under `src/`; **408 in the git index**. The gap is the 9 per-module `README.md` files, deleted but not yet committed. (A raw `fd --hidden --no-ignore` count returns 402 — three of those are stray `.DS_Store` files, not source.)
- **143 cross-module imports go through a deep path; 5 go through a barrel.** Only 4 of those 5 come from outside the owning module — the fifth is `updater` importing its own `index.ts`.
- **9 modules.** Only `delivery`, `shift-reports`, and `updater` have *any* external consumer reaching them through `index.ts`. The other 6 have 100% deep fan-in: not a single external import goes through their barrel.
- **`menu` is the largest module, `order` the smallest.**

Per-module file counts in the inventory below are git-index counts, so each includes that module's now-deleted `README.md`.

---

## Current module inventory

**The folder paths in this section are today's layout, not the target shape.** `persistence/`, `use-cases/`, `domain/`, `store/`, `adapters/`, and `hooks/` appear throughout because that is where the code currently sits — see [`BAKO.md` § Layers that do not exist in this model](../../BAKO.md#layers-that-do-not-exist-in-this-model) for the canonical list of what those paths become. What matters here is the second half of each entry: the **behavioral traps** a migration must preserve.

Each entry was written from the module's own code — `index.ts`, its largest file, its specs, and `manifest.ts` where present — not from the module's old `README.md` (those files are being removed; several had gone stale or wrong).

- **checkout/** (47 files, fan-in 7, 0% via barrel) — sale flow: cart → persisted order → ticket. `persistence/order-drizzle.repository.ts` (719 lines, exported as `orderDrizzleRepository`) is the single write path for orders; `createOrder` runs inside `withTransaction`, covering the optional customer insert + order + items + payment atomically. All money fields are integer cents (ADR-0001). `adapters/print-ticket.adapter.ts` normalizes an order into a serializable payload before invoking `print_ticket`.

- **delivery/** (21 files, fan-in 2, 100% via barrel) — delivery-person CRUD plus a daily cut report. `persistence/delivery-person-drizzle.repository.ts` implements the repository directly against the `delivery_persons` table. Both Settings panels registered in `manifest.ts` (person CRUD, daily cut) are gated by the same feature flag, `delivery_enabled`. One of only two modules where every external import already goes through `index.ts`.

- **feature-flags/** (17 files, fan-in 14, 0% via barrel, fan-out 0) — `FeatureFlagKey` is typed as a plain `string`, not a fixed union. The real flag set lives only in `DEFAULT_FLAGS` inside `store/feature-flags-store.ts`: 8 flags today — `categories_enabled`, `multiple_menus_enabled`, `delivery_enabled`, `shift_management_enabled`, `auto_update_enabled`, `modifier_groups_enabled`, `comandas_enabled`, `receipt_printing_enabled`. `setFlag` applies an optimistic update to the Zustand store before persisting. `useFeatureFlagsStore` is the runtime source of truth other modules read directly — which is why 14 files deep-import `store/feature-flags-store` instead of the barrel.

- **menu/** (79 files, fan-in 23, 0% via barrel) — the product catalog: menus, categories, products, modifier groups. Owns 4 of the entries in `app/module-registry.ts` (`productsManifest`, `categoriesManifest`, `menusManifest`, `modifierGroupsManifest`). `use-cases/list-product-modifier-groups-batch.ts` resolves modifier groups for N products in **at most 2 SQL queries** (`listByCategoryIds` + `listByProductIds`, deduplicated) instead of N+1 — a real, tested contract: `hooks/use-product-modifier-groups-map.dom.spec.tsx` asserts exactly one batch call for 50 products across 2 categories. Do not reintroduce a per-product call in the POS grid. `test/factories` is deep-imported by 9 files — 4 in `checkout`, 3 in `order`, 1 in `shift-reports`, plus `app/App.dom.spec.tsx`, which belongs to no module at all — the widest untracked dependency surface in the codebase.

- **order/** (8 files, fan-in 13, 0% via barrel) — the in-memory cart for the active POS session; it persists nothing itself. `domain/cart.ts` is pure (`calculateCartTotals`, `addItemToCart`, `incrementItemQuantity`, `decrementItemQuantity`, `removeItemFromCart`); `store/order-store.ts` is a thin Zustand wrapper that only calls those functions. Depends on `menu` for `Product`/`SelectedModifier`. `checkout` deep-imports `domain/cart` from 6 files to turn `CartItem[]` into a `CreateOrderInput`.

- **printer/** (28 files, fan-in 17, 0% via barrel) — printer configuration CRUD against the `printers` table: register a device, assign it to categories, mark a default. **Not** the print engine — that's `src-tauri/src/print/` in Rust (see [`printing.md`](printing.md)). This module never calls `print_ticket` or `print_command`, only `list_usb_printers` and `test_printer`.

- **settings/** (19 files, fan-in 17, 0% via barrel) — the composition root for the Settings modal. Owns no domain of its own; imports admin panels directly from `menu`, `shift-reports`, `feature-flags`, and `updater`. `store/settings-store.ts` reads and writes `systemSettings` straight through the shared Drizzle `db` client — the one module that bypasses any repository layer, by design: locale/currency/printer defaults are plain key-value settings, not a domain with invariants to protect.

- **shift-reports/** (67 files, fan-in 3, ~33% via barrel) — shift open/close, the sales report, and full cash-drawer accounting: `cash_movements` (`addCashMovement`/`updateCashMovement`/`deleteCashMovement`/`listCashMovements` in `persistence/shift-drizzle.repository.ts`), plus `openingCash`/`countedCash`/`cashDifference`/`expectedCash` on every shift and report. Also owns order editing and voiding (`EditOrderModal`, `VoidOrderConfirm`) and the reprint flows for tickets, shift reports, and kitchen commands (`lib/reprint-*.ts`), which deep-import `checkout`, `menu`, and `printer`.

- **updater/** (15 files, fan-in 4, 50% via barrel) — wraps `@tauri-apps/plugin-updater`. `store/updater-store.ts` is the single source of truth for update status, read by both the header toast and the Settings panel. No `flagKey` on its manifest by design: hiding the tab would remove the only control for `auto_update_enabled` itself. It carries a `settings ↔ updater` import cycle that has to be resolved before it can migrate — see [`module-system.md`](module-system.md) §4–5.

---

## Migration order

### 1. `updater` — the pilot

`updater` migrates first: 15 files, one store, one Settings panel, and an already-documented resolution for the only structural blocker in the module map. It resolves the `settings ↔ updater` cycle **as part of** its migration, not before or after it. The fix is to read the panel off the registry entry (`registry.find((m) => m.id === "updater")?.settingsPanel`) instead of importing the component by path from `SettingsModal.tsx` — the registry already carries the exact component reference the direct import duplicates. Full analysis in [`module-system.md`](module-system.md) §4.

### 2. Retiring `src/shared/`

| Today | Destination |
|---|---|
| `shared/db/{client,schema}.ts` | `src/db/` |
| `shared/i18n/**` (5 locales × 11 namespaces) | `src/i18n/` |
| `shared/components/ColorInput.tsx` | `src/components/` |
| `shared/stores/pos-store.ts` | `src/modules/pos/` (new module — screen-orchestration state: category filter, checkout/settings modal visibility, mobile cart drawer; not data owned by any single feature) |

`src/lib/` is already flat and already matches the target model — nothing moves there.

**None of this is executed yet.** Relocating `shared/db` alone touches the imports of roughly 30 files; it is code work, not documentation work, and it is scheduled separately, module by module. Rationale for each destination — including why `pos-store.ts` becomes its own module rather than joining `order` — in [`module-system.md`](module-system.md) §1.

### 3. Migration rules

Verifiable in review, on every module that moves:

1. **The barrel is the boundary.** The target is the absolute rule in [`BAKO.md`](../../BAKO.md) — a migrated module's only public entry point is its `index.ts`.
2. A module moves to the target shape **only when real work already touches it** — no drive-by restructuring.
3. Existing tests pass **without touching their assertions**. If an assertion changes, it wasn't a structural migration.
4. `neverthrow` (`ResultAsync`) is kept wherever it's already used; a migration doesn't rip it out in the same PR.
5. Tests stay co-located next to the file they cover — Bako already does this.

---

See [`BAKO.md`](../../BAKO.md) for the architecture this file is migrating toward, and [`module-system.md`](module-system.md) for the reasoning behind each decision.
