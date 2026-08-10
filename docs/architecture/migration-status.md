# Migration status — temporary

> **This file is a snapshot, not a rule.** It records where Bako's code stands *today*, mid-migration, so a future change has a number to move and a way to tell whether it moved. It defines nothing. The rules — the target structure, the barrel boundary, the layers that no longer exist — live in [`BAKO.md`](../../BAKO.md), and `BAKO.md` wins on every disagreement.
>
> **Delete this file when the migration is finished.** Nothing else should ever come to depend on it.

---

## Baseline (measured 2026-08-10)

Figures below are a measurement taken on a specific day, not a permanent property of the codebase. Re-measure before quoting them.

- **400 source files under `src/`, on disk and in the git index alike** — the two agree now that the per-module `README.md` deletions are committed. 342 of them are `.ts`/`.tsx`; the rest are locale JSON, assets, and CSS. (A raw `fd --hidden --no-ignore` count returns 402 — two of those are stray `.DS_Store` files, not source.)
- **142 cross-module imports go through a deep path; 7 go through a barrel.** Counted as `from "@/modules/<m>/…"` versus `from "@/modules/<m>"`, in files outside the owning module only — the same methodology that produced the 2026-08-09 figures (143 deep, 4 barrel), so the two are directly comparable.
- **10 modules.** `pos` is new; it came out of `src/shared/stores/`. Four modules now have *any* external consumer reaching them through `index.ts`: `pos` (3 of 3), `updater` (2 of 3), `delivery` (1 of 2), `shift-reports` (1 of 3). The other 6 still have 100% deep fan-in: not a single external import goes through their barrel.
- **`menu` is the largest module (78 files), `pos` the smallest (3).**
- **`src/shared/` no longer exists** — not empty, deleted. See § Migration order 2 for where its four occupants went.

Per-module file counts in the inventory below are git-index counts. Only `updater` and `pos` were re-measured on 2026-08-10; the other eight still carry their 2026-08-09 figures, each of which counted a per-module `README.md` that has since been removed — subtract one from each.

---

## Current module inventory

**The folder paths in this section are today's layout, not the target shape — with two exceptions.** `persistence/`, `use-cases/`, `domain/`, `store/`, `adapters/`, and `hooks/` still appear across the eight unmigrated modules because that is where the code currently sits — see [`BAKO.md` § Layers that do not exist in this model](../../BAKO.md#layers-that-do-not-exist-in-this-model) for the canonical list of what those paths become. `updater/` and `pos/` are the exceptions: both are already flat, with no layer folders and a curated barrel, so their paths *are* the target shape. What matters in every entry is the second half: the **behavioral traps** a migration must preserve.

Each entry was written from the module's own code — `index.ts`, its largest file, its specs, and `manifest.ts` where present — not from the module's old `README.md` (those files have since been removed; several had gone stale or wrong).

- **checkout/** (47 files, fan-in 7, 0% via barrel) — sale flow: cart → persisted order → ticket. `persistence/order-drizzle.repository.ts` (719 lines, exported as `orderDrizzleRepository`) is the single write path for orders; `createOrder` runs inside `withTransaction`, covering the optional customer insert + order + items + payment atomically. All money fields are integer cents (ADR-0001). `adapters/print-ticket.adapter.ts` normalizes an order into a serializable payload before invoking `print_ticket`.

- **delivery/** (21 files, fan-in 2, 100% via barrel) — delivery-person CRUD plus a daily cut report. `persistence/delivery-person-drizzle.repository.ts` implements the repository directly against the `delivery_persons` table. Both Settings panels registered in `manifest.ts` (person CRUD, daily cut) are gated by the same feature flag, `delivery_enabled`. One of only two modules where every external import already goes through `index.ts`.

- **feature-flags/** (17 files, fan-in 14, 0% via barrel, fan-out 0) — `FeatureFlagKey` is typed as a plain `string`, not a fixed union. The real flag set lives only in `DEFAULT_FLAGS` inside `store/feature-flags-store.ts`: 8 flags today — `categories_enabled`, `multiple_menus_enabled`, `delivery_enabled`, `shift_management_enabled`, `auto_update_enabled`, `modifier_groups_enabled`, `comandas_enabled`, `receipt_printing_enabled`. `setFlag` applies an optimistic update to the Zustand store before persisting. `useFeatureFlagsStore` is the runtime source of truth other modules read directly — which is why 14 files deep-import `store/feature-flags-store` instead of the barrel.

- **menu/** (79 files, fan-in 23, 0% via barrel) — the product catalog: menus, categories, products, modifier groups. Owns 4 of the entries in `app/module-registry.ts` (`productsManifest`, `categoriesManifest`, `menusManifest`, `modifierGroupsManifest`). `use-cases/list-product-modifier-groups-batch.ts` resolves modifier groups for N products in **at most 2 SQL queries** (`listByCategoryIds` + `listByProductIds`, deduplicated) instead of N+1 — a real, tested contract: `hooks/use-product-modifier-groups-map.dom.spec.tsx` asserts exactly one batch call for 50 products across 2 categories. Do not reintroduce a per-product call in the POS grid. `test/factories` is deep-imported by 9 files — 4 in `checkout`, 3 in `order`, 1 in `shift-reports`, plus `app/App.dom.spec.tsx`, which belongs to no module at all — the widest untracked dependency surface in the codebase.

- **order/** (8 files, fan-in 13, 0% via barrel) — the in-memory cart for the active POS session; it persists nothing itself. `domain/cart.ts` is pure (`calculateCartTotals`, `addItemToCart`, `incrementItemQuantity`, `decrementItemQuantity`, `removeItemFromCart`); `store/order-store.ts` is a thin Zustand wrapper that only calls those functions. Depends on `menu` for `Product`/`SelectedModifier`. `checkout` deep-imports `domain/cart` from 6 files to turn `CartItem[]` into a `CreateOrderInput`.

- **pos/** (3 files, fan-in 3, 100% via barrel, fan-out 0) — view-state for the single POS screen, not data owned by any feature: `selectedCategory`, `isCheckoutOpen` + `checkoutSessionKey`, `isMobileCartOpen`, `isSettingsOpen`. There is no line item, no total, no order id in it. **Born in the target shape** — flat, no layer folders, just `pos-store.ts` with its co-located spec and a barrel exporting exactly `POS_CATEGORY_FILTER` and `usePosStore`. Fan-out 0: the store imports `zustand` and nothing else, not one other module. All three external consumers (`app/App.tsx`, `app/App.dom.spec.tsx`, `menu/hooks/use-filtered-products.ts`) enter through the barrel. `POS_CATEGORY_FILTER.ALL` is the sentinel `selectedCategory` starts at, so "no filter" is a named value rather than a bare `"all"` string spread across callers. Split out of `src/shared/stores/pos-store.ts` rather than folded into `order` — reasoning in [`module-system.md`](module-system.md) §1.

- **printer/** (28 files, fan-in 17, 0% via barrel) — printer configuration CRUD against the `printers` table: register a device, assign it to categories, mark a default. **Not** the print engine — that's `src-tauri/src/print/` in Rust (see [`printing.md`](printing.md)). This module never calls `print_ticket` or `print_command`, only `list_usb_printers` and `test_printer`.

- **settings/** (19 files, fan-in 17, 0% via barrel) — the composition root for the Settings modal. Owns no domain of its own; imports admin panels directly from `menu`, `shift-reports`, and `feature-flags`. It no longer imports `updater`: that panel now comes off the module registry, which is what resolved the `settings ↔ updater` cycle ([`module-system.md`](module-system.md) §4). `store/settings-store.ts` reads and writes `systemSettings` straight through the shared Drizzle `db` client — the one module that bypasses any repository layer, by design: locale/currency/printer defaults are plain key-value settings, not a domain with invariants to protect.

- **shift-reports/** (67 files, fan-in 3, ~33% via barrel) — shift open/close, the sales report, and full cash-drawer accounting: `cash_movements` (`addCashMovement`/`updateCashMovement`/`deleteCashMovement`/`listCashMovements` in `persistence/shift-drizzle.repository.ts`), plus `openingCash`/`countedCash`/`cashDifference`/`expectedCash` on every shift and report. Also owns order editing and voiding (`EditOrderModal`, `VoidOrderConfirm`) and the reprint flows for tickets, shift reports, and kitchen commands (`lib/reprint-*.ts`), which deep-import `checkout`, `menu`, and `printer`.

- **updater/** (14 files, fan-in 3, 2 of 3 via barrel) — wraps `@tauri-apps/plugin-updater`. **Migrated: already in the target shape.** No layer folders — `updater-store.ts`, `use-updater.ts`, `update-status.ts`, `tauri-updater.adapter.ts`, `UpdateToast.tsx`, `UpdateSettingsPanel.tsx` and `manifest.ts` all sit at the module root with their specs co-located. `index.ts` exports exactly two symbols, `useUpdater` and `UpdateToast`, because those are the only things anything outside the module consumes. `UpdateSettingsPanel` is deliberately **not** exported: `manifest.ts` reaches it locally as `./UpdateSettingsPanel` and hands the reference to the registry, so no external caller needs it. Of the 3 external importers, 2 enter through the barrel (`app/App.tsx`, `app/App.dom.spec.tsx`); the third is `app/module-registry.ts` importing `@/modules/updater/manifest`, which is the documented `manifest.ts` exception ([`module-system.md`](module-system.md) §5), not a leak. The `settings ↔ updater` cycle is resolved — see [`module-system.md`](module-system.md) §4.

  Behavioral traps, unchanged by the migration: `updater-store.ts` is the single source of truth for update status, read by both the header toast and the Settings panel. No `flagKey` on its manifest by design — hiding the tab would remove the only control for `auto_update_enabled` itself.

---

## Migration order

### 1. `updater` — the pilot ✅ done

`updater` migrated first: one store, one Settings panel, and an already-documented resolution for the only structural blocker in the module map. It resolved the `settings ↔ updater` cycle **as part of** its migration, not before or after it, exactly as planned — the panel is now read off the registry entry (`registry.find((manifest) => manifest.id === "updater")?.settingsPanel` in `SettingsModal.tsx`) instead of being imported by path, because the registry already carried the exact component reference the direct import duplicated. There is deliberately no fallback: if the manifest stops carrying a panel, the tab disappears rather than silently rendering something else. The module was then flattened, its barrel curated down to `useUpdater` and `UpdateToast`, and its external consumers repointed at that barrel. Full analysis in [`module-system.md`](module-system.md) §4; the resulting shape is in the inventory entry above.

### 2. Retiring `src/shared/` ✅ done

`src/shared/` is gone — the directory is deleted, not merely empty. What moved where:

| Was | Destination |
|---|---|
| `shared/db/{client,schema}.ts` | `src/db/` |
| `shared/i18n/**` (5 locales × 11 namespaces) | `src/i18n/` |
| `shared/components/ColorInput.tsx` | `src/components/` |
| `shared/stores/pos-store.ts` | `src/modules/pos/` (new module — screen-orchestration state: category filter, checkout/settings modal visibility, mobile cart drawer; not data owned by any single feature) |

`src/lib/` was already flat and already matched the target model — nothing moved there.

Relocating `shared/db` was the largest of the four: it rewrote the imports of **22 files** outside `src/db/` itself. Rationale for each destination — including why `pos-store.ts` became its own module rather than joining `order` — in [`module-system.md`](module-system.md) §1.

### 3. Migration rules

Verifiable in review, on every module that moves:

1. **The barrel is the boundary.** The target is the absolute rule in [`BAKO.md`](../../BAKO.md) — a migrated module's only public entry point is its `index.ts`.
2. A module moves to the target shape **only when real work already touches it** — no drive-by restructuring.
3. Existing tests pass **without touching their assertions**. If an assertion changes, it wasn't a structural migration.
4. `neverthrow` (`ResultAsync`) is kept wherever it's already used; a migration doesn't rip it out in the same PR.
5. Tests stay co-located next to the file they cover — Bako already does this.

---

## What is left

Eight modules have not migrated: `checkout`, `delivery`, `feature-flags`, `menu`, `order`, `printer`, `settings`, `shift-reports`. Each still carries its legacy layer folders (`persistence/`, `use-cases/`, `domain/`, `store/`, `adapters/`, `hooks/`) and each still takes most or all of its fan-in through deep paths — six of the eight take 100% of it that way. Together they account for all 142 remaining deep cross-module imports.

**This document does not define an order for them, and no order should be inferred from the list above — it is alphabetical.** Rule 2 in § Migration rules is the scheduling policy: a module moves when real work already touches it. Whoever gets there first follows the five-step procedure in [`module-system.md`](module-system.md) §7, which the `updater` pilot has now validated end to end.

One open question travels with `menu`: `@/modules/menu/test/factories` is deep-imported by 9 files outside `menu`. Whoever migrates `menu` decides whether those factories go through `index.ts` or become a second documented exception alongside `manifest.ts` — see [`module-system.md`](module-system.md) §2.

---

See [`BAKO.md`](../../BAKO.md) for the architecture this file is migrating toward, and [`module-system.md`](module-system.md) for the reasoning behind each decision.
