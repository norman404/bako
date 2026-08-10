# Module system

This guide elaborates on [`BAKO.md`](../../BAKO.md). If anything here conflicts with `BAKO.md`, `BAKO.md` wins.

`BAKO.md` states every rule once. This file does not restate them — it holds the reasoning behind the decisions, the documented exceptions, and the procedure for migrating a module. Where the code actually stands against those rules is in [`migration-status.md`](migration-status.md).

---

## 1. Project structure

The target tree — and why there is no `shared/` folder in it — is in [`BAKO.md` § Project structure](../../BAKO.md#project-structure). What moves where, and why none of it has run yet, is in [`migration-status.md`](migration-status.md).

### The `pos-store.ts` decision

The plan left this one destination open, to be resolved by reading the file. Read in full, `pos-store.ts` holds exactly four pieces of state:

- `selectedCategory` — the active category filter for browsing the menu.
- `isCheckoutOpen` + `checkoutSessionKey` — whether the checkout flow is open, plus a counter that forces a fresh session each time it reopens.
- `isMobileCartOpen` — whether the mobile cart drawer is open.
- `isSettingsOpen` — whether the Settings modal is open.

None of this is order or cart *data* — there is no line item, no total, no order id in the store. It is visibility/toggle state for panels that belong to four different modules: `menu` (category filter), `checkout` (checkout modal), `settings` (settings modal), and the mobile cart drawer that lives at the app-shell level. Putting it in `src/modules/order/` would mean `settings` and `menu` components importing `@/modules/order` just to toggle a settings modal or read a category filter that has nothing to do with orders — a coupling that doesn't match what the state actually is.

**Decision: `pos-store.ts` moves to a new module, `src/modules/pos/`.** Bako has a single POS screen (no routing) and this store is the view-state of that screen: which overlay is showing and which category is being browsed. It is the one case in the module map where the state is genuinely cross-cutting screen orchestration rather than a feature domain — consistent with terax not having global stores: the store still lives inside a module, just not inside `order`, `checkout`, `settings`, or `menu`, because it isn't about any one of them specifically.

---

## 2. Module shape

The target shape is in [`BAKO.md` § Module system](../../BAKO.md#module-system), and the layers it replaces are listed in [`BAKO.md` § Layers that do not exist in this model](../../BAKO.md#layers-that-do-not-exist-in-this-model). The rules a migration is checked against in review are in [`migration-status.md` § Migration rules](migration-status.md#3-migration-rules).

### `test/` is the one subfolder a small module may have

`components/` and `lib/` appear only when a module's size justifies them. `test/` is the exception: **`test/factories.ts` inside a module is legal at any size**, because factories are shared test *helpers*, not tests. The specs themselves stay co-located next to the file they cover — Bako does not group tests into a separate `test/` tree. See [`docs/contributing/testing.md`](../contributing/testing.md).

Open question the migration has to answer: `@/modules/menu/test/factories` is deep-imported from outside `menu` today — by `checkout`, `order`, `shift-reports`, and `src/app/App.dom.spec.tsx`. Those are deep imports, so the barrel rule (§3) reaches them too. Whoever migrates `menu` decides whether the factories are exported through `index.ts` or accepted as a second documented exception alongside `manifest.ts` (§5). This document does not decide it.

---

## 3. The barrel rule

The rule is in [`BAKO.md` § The barrel is the boundary](../../BAKO.md#the-barrel-is-the-boundary). The measured baseline — how many cross-module imports still go through a deep path, and which modules have any fan-in through their barrel at all — is in [`migration-status.md`](migration-status.md), dated.

This guide adds two things to the rule: `manifest.ts` is a documented exception (§5), and `test/factories` is an open question (§2).

---

## 4. The `settings` ↔ `updater` cycle

This is a fact about the current code, not a hypothesis:

- `src/modules/settings/components/SettingsModal.tsx:12` imports `UpdateSettingsPanel` directly: `import { UpdateSettingsPanel } from "@/modules/updater/components/UpdateSettingsPanel";`
- `src/modules/updater/manifest.ts:2` imports the type contract from settings: `import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";`

The old `updater/README.md` claimed "`settings` NUNCA importa este módulo." The code contradicts it.

There already is a mechanism built to prevent exactly this: `src/app/module-registry.ts` builds `MODULE_REGISTRY: ModuleManifest[]` by importing every module's `manifest.ts` and handing the array to `SettingsModal` as a prop. `updaterManifest` already carries `settingsPanel: UpdateSettingsPanel` inside that array — the registry entry for `updater` already *is* the reference `SettingsModal` needs.

`SettingsModal.tsx` receives that full registry, then does this: it filters `manifest.id === "updater"` **out** of the generic module-tabs loop (line 42, comment: "Updater is now in the general group"), and instead hand-builds an equivalent tab in `generalTabs` by importing `UpdateSettingsPanel` again, directly, from `@/modules/updater/components/UpdateSettingsPanel`. The registry already had the exact component reference; the direct import duplicates data the registry already carries, and that duplication is the entire cycle.

**Decision: the registry is the correct mechanism. The direct import in `SettingsModal.tsx:12` is the violation to remove — not the registry to replace.** The fix, applied when `updater` migrates, is to read the Panel off the matching registry entry — `registry.find((m) => m.id === "updater")?.settingsPanel` — instead of importing the component by path, and keep placing that tab in the "general" group as today. That removes the `settings → updater` edge entirely. `updater/manifest.ts` keeps its edge to the `ModuleManifest` contract `settings` owns, but that one is one-directional and type-only — a module depending on a contract, not a cycle.

---

## 5. `manifest.ts` as a public export

The `manifest.ts` files (`menu`, `checkout`, `delivery`, `printer`, `shift-reports`, `updater`) are imported today by deep path from `src/app/module-registry.ts` — e.g. `@/modules/delivery/manifest` — never through a barrel. If the barrel is the only boundary (§3), this is a real exception, not an oversight to silently allow.

**Decision: `manifest.ts` is a documented exception to the barrel rule, not something to re-export from `index.ts`.** It may be deep-imported as `@/modules/<module>/manifest`, and exclusively from `src/app/module-registry.ts` — the one composition root responsible for wiring modules into the Settings registry. No other file gets a pass to import a module's `manifest.ts` by path.

Reason: `module-registry.ts` runs at app composition time and needs only the manifest object (an id, some flags, a component reference) for every module, up front. If `manifest` were re-exported through `index.ts` instead, registering a module would force loading its entire public barrel — components, stores, repository code, everything else that module exports — just to read a handful of metadata fields. That's needless weight at boot, and it's exactly the kind of eager cross-loading that produces cycles like §4's: two modules' barrels pulling on each other transitively through registration alone, not through any real feature dependency.

---

## 6. Naming: kebab-case, not camelCase

The decision is in [`BAKO.md` § Conventions](../../BAKO.md#conventions). The reasoning is the comparison it comes from: terax, the codebase this module system is adopted from, uses camelCase (`useUpdater.ts`, `applyTheme.ts`).

Bako does not follow it there. Renaming every file under `src/` would buy a stylistic match with zero behavioral or structural gain — pure churn. The structural ideas are worth adopting (flat modules, barrel boundary, manifest exception); the filename casing is not, because there is no argument for it beyond "terax does it this way."

---

## 7. Migrating a module, step by step

A module migrates only when real work already touches it — never as a standalone refactor. When that moment comes, in this order:

1. **Run the module's tests before touching anything.**

   ```bash
   bun run scripts/run-tests.ts 'src/modules/<feature>/**/*.spec.ts'
   ```

   Add `'src/modules/<feature>/**/*.dom.spec.tsx'` if the module has component specs. Green here is the regression net for every step below. If it isn't green before you start, that is a separate change — fix it first.

2. **Flatten.** Each legacy layer has one destination:

   | Today | Destination |
   |---|---|
   | `use-cases/x.ts`, `domain/x.ts` | module root — `<feature>.ts` |
   | `persistence/x-drizzle.repository.ts` | `repository.ts` |
   | `store/x-store.ts` | `<feature>-store.ts` |
   | `hooks/use-x.ts` | `use-<feature>.ts` |
   | `adapters/x.ts` | module root, or `lib/` if the module is large enough to justify a subfolder |

   Each spec moves with the file it covers and keeps its name.

3. **Curate the barrel.** `index.ts` exports only what other modules actually consume — nothing else. A symbol with no external consumer does not belong in the barrel; internal reach is what the flat layout is for.

4. **Repoint the external consumers at the barrel.** This is the step that removes deep imports: every `@/modules/<feature>/<path>` written outside the module becomes `@/modules/<feature>`. If a consumer needs something the barrel doesn't export, export it (back to step 3) — never reach past it.

5. **Verify.** Re-run the module's tests, then the full gate in [`BAKO.md` § Verify before claiming done](../../BAKO.md#verify-before-claiming-done). The tests must pass **without a single assertion changed**. If you had to edit an assertion, this stopped being a structural migration and became a behavior change — and that is a different PR.

`updater` is the pilot. Its one structural blocker is the cycle in §4, resolved as part of its migration rather than before it. Migration order and per-module traps are in [`migration-status.md`](migration-status.md).

---

See [`BAKO.md`](../../BAKO.md) for the architecture this document elaborates on.
