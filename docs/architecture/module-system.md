# Module system

This guide elaborates on [`BAKO.md`](../../BAKO.md). If anything here conflicts with `BAKO.md`, `BAKO.md` wins.

`BAKO.md` states every rule once. This file does not restate them — it holds the reasoning behind the decisions, the two documented exceptions, and the procedure a module follows when it is restructured.

---

## 1. Project structure

The tree — and why there is no `shared/` folder in it — is in [`BAKO.md` § Project structure](../../BAKO.md#project-structure). `src/shared/` has been retired: the folder is deleted, not merely empty, and its four occupants moved out.

| Was | Destination |
|---|---|
| `shared/db/{client,schema}.ts` | `src/db/` |
| `shared/i18n/**` | `src/i18n/` |
| `shared/components/ColorInput.tsx` | `src/components/` |
| `shared/stores/pos-store.ts` | `src/modules/pos/` — a new module; see the decision below |

`src/lib/` was already flat and already matched this model, so nothing moved there. Relocating `shared/db` was the largest of the four: it rewrote the imports of 22 files outside `src/db/` itself.

### The `pos-store.ts` decision

The plan left this one destination open, to be resolved by reading the file. Read in full, `pos-store.ts` holds exactly three pieces of state:

- `selectedCategory` — the active category filter for browsing the menu.
- `isCheckoutOpen` + `checkoutSessionKey` — whether the checkout flow is open, plus a counter that forces a fresh session each time it reopens.
- `isMobileCartOpen` — whether the mobile cart drawer is open.

The Settings-window launch and workspace selection are app-shell state because both POS and Administration can open Settings. The remaining store state is not order or cart *data* — there is no line item, no total, no order id in it. It is POS view state for `menu` (category filter), `checkout` (checkout modal), and the mobile cart drawer. Putting it in `src/modules/order/` would couple unrelated UI to order data.

**Decision: `pos-store.ts` lives in `src/modules/pos/`.** The store owns POS-only view state. `App` owns cross-workspace state; the cart itself remains in `order-store.ts`, so changing workspaces does not discard a sale.

---

## 2. Module shape

The shape is in [`BAKO.md` § Module system](../../BAKO.md#module-system), and the layers it replaced are listed in [`BAKO.md` § Layers that do not exist in this model](../../BAKO.md#layers-that-do-not-exist-in-this-model). The rules a structural change is checked against in review are in [`BAKO.md` § Migration strategy](../../BAKO.md#migration-strategy); the step-by-step procedure is §7 below.

---

## 3. The barrel rule

The rule is in [`BAKO.md` § The barrel is the boundary](../../BAKO.md#the-barrel-is-the-boundary). All ten modules satisfy it: every cross-module import outside the owning module resolves either to `@/modules/<module>` or to a documented capability-bound entry below. There is no ad-hoc third form; a new one is a review failure, not a precedent.

This guide documents the two exceptions to the rule, each bounded by call site and runtime surface: `manifest.ts` and `settings-window-entry.ts` (§5).

---

## 4. App-owned navigation contract

`settingsPanel` was correct only while Settings was the sole shell. Bako now has POS, Administration, and Settings, so `src/app/module-manifest.ts` owns the neutral `ModuleManifest` contract. It declares a module's `navigation[]` entries: stable id, target surface, group, order, localized label, icon, component, and optional feature flag.

`src/app/module-registry.ts` imports every module manifest and validates navigation IDs once. `AdminWorkspace` filters entries for `admin`; the native `SettingsWindowApp` composes its technical entries with General, Features, and System panels. Neither shell reaches into a module component directly.

This keeps the updater-cycle resolution intact without loading Main-only updater services in the child: `src/app/settings-window-registry.ts` composes dedicated child-safe entries. The updater entry disappears only if its manifest is removed.

---

## 5. Documented exceptions to the barrel rule

There are exactly two exceptions, bounded by *who* may use them and which runtime surface may load them:

| Exception | Permitted import | Permitted call site |
|---|---|---|
| `manifest.ts` | `@/modules/<module>/manifest` | `src/app/module-registry.ts` only |
| `settings-window-entry.ts` | `@/modules/<module>/settings-window-entry` | Native Settings child composition graph only |

Anything else that reaches past an `index.ts` is a violation. Adding another exception is an architectural decision, not a judgment call at the call site.

### `manifest.ts`

The `manifest.ts` files (`menu`, `checkout`, `metrics`, `printer`, `shift-reports`, `updater`) are imported by deep path from `src/app/module-registry.ts` — e.g. `@/modules/printer/manifest` — never through a barrel. If the barrel is the only boundary (§3), this is a real exception, not an oversight to silently allow.

**Decision: `manifest.ts` is a documented exception to the barrel rule, not something to re-export from `index.ts`.** It may be deep-imported as `@/modules/<module>/manifest`, and exclusively from `src/app/module-registry.ts` — the one composition root responsible for wiring modules into the application registry. No other file gets a pass to import a module's `manifest.ts` by path.

Reason: `module-registry.ts` runs at app composition time and needs only the manifest object (an id, some flags, a component reference) for every module, up front. If `manifest` were re-exported through `index.ts` instead, registering a module would force loading its entire public barrel — components, stores, repository code, everything else that module exports — just to read a handful of metadata files. That's needless weight at boot, and it's exactly the kind of eager cross-loading that produces cycles like §4's: two modules' barrels pulling on each other transitively through registration alone, not through any real feature dependency.

### `settings-window-entry.ts`

The native Settings webview has a distinct Tauri capability set: it may use directed events and the file dialog, but never SQLite, process, or updater APIs. In development, importing a single symbol from a broad barrel can still evaluate its other re-exports. Production tree-shaking is therefore not a security or architecture boundary.

**Decision: `settings-window-entry.ts` is a documented child-safe entry, not a second general-purpose barrel.** It may be deep-imported only from the Settings child composition graph: `src/app/settings-window-main.tsx`, `src/app/settings-window-app.tsx`, `src/app/settings-window-registry.ts`, and other child-safe Settings entries or panels. It exports only child-safe UI, serializable types, and Settings RPC client code. It never imports `src/db`, SQL, process, updater, or a module's broad `index.ts`.

Reason: this keeps Main as the sole SQLite/plugin owner in both development and production. `src/app/settings-window-registry.ts` composes the dedicated printer and updater entries without loading their repositories or Main stores; Main itself continues to use ordinary module barrels and services.

---

## 6. Naming: kebab-case, not camelCase

The decision is in [`BAKO.md` § Conventions](../../BAKO.md#conventions). The reasoning is the comparison it comes from: terax, the codebase this module system is adopted from, uses camelCase (`useUpdater.ts`, `applyTheme.ts`).

Bako does not follow it there. Renaming every file under `src/` would buy a stylistic match with zero behavioral or structural gain — pure churn. The structural ideas are worth adopting (flat modules, barrel boundary, manifest exception); the filename casing is not, because there is no argument for it beyond "terax does it this way."

---

## 7. Migrating a module, step by step

A module migrates only when real work already touches it — never as a standalone refactor. When that moment comes, in this order:

1. **Inspect the module and run the relevant quality checks before touching anything.** If the change reaches Rust behavior, run the focused Cargo tests first. If the checks are not green before you start, that is a separate change — fix it first.

2. **Flatten.** Each legacy layer has one destination:

   | Today | Destination |
   |---|---|
   | `use-cases/x.ts`, `domain/x.ts` | module root — `<feature>.ts` |
   | `persistence/x-drizzle.repository.ts` | `repository.ts` |
   | `store/x-store.ts` | `<feature>-store.ts` |
   | `hooks/use-x.ts` | `use-<feature>.ts` |
   | `adapters/x.ts` | module root, or `lib/` if the module is large enough to justify a subfolder |

   Each implementation file keeps its name unless the flattening requires a meaningfully clearer name.

3. **Curate the barrel.** `index.ts` exports only what other modules actually consume — nothing else. A symbol with no external consumer does not belong in the barrel; internal reach is what the flat layout is for.

4. **Repoint the external consumers at the barrel.** This is the step that removes deep imports: every `@/modules/<feature>/<path>` written outside the module becomes `@/modules/<feature>`, except a documented capability-bound entry in §5. If a consumer needs something the barrel doesn't export, export it (back to step 3) — never reach past it.

5. **Verify.** Run the relevant focused checks, then the full gate in [`BAKO.md` § Verify before claiming done](../../BAKO.md#verify-before-claiming-done). If the change alters behavior, document it as a behavior change rather than calling it purely structural.

`updater` was the pilot. Its one structural blocker was the cycle in §4, resolved as part of the migration rather than before it. The procedure then ran to completion across the rest of the repo: **all ten modules are in the flat shape, no layer folders remain anywhere under `src/modules/`, and every cross-module import goes through a barrel or a documented exception in §5.** The five steps above are not a proposal and not a historical record — they are the procedure for the next module that needs restructuring, and for checking that a new module was born in the right shape.

### The trap the migration hit

It cost real debugging time and is not obvious from the five steps. It applies to any future flattening.

#### 1. Flattening collides files, and the case-only collisions are silent

Files from different layer folders land in the same directory, so two of them can claim the same name. There are two flavors:

- **Exact.** `domain/print-ticket.ts` and `components/print-ticket.ts` in `checkout` both want `checkout/print-ticket.ts`. Loud — the second `git mv` overwrites, or the tooling complains.
- **Case-only.** `domain/cart.ts` and `components/Cart.tsx` in `order` both want `order/cart.*`. This one is silent and dangerous. On a case-insensitive filesystem both files answer to `./cart`, and the two toolchains disagree about which one wins: **Bun resolves `.tsx` before `.ts`, TypeScript resolves the other way.** The same import specifier then loads a *different file* at runtime than the one the typechecker validated — and `bun run build` still passes, because each tool is internally consistent. Nothing in the gate catches it.

**Do this before moving anything:** simulate the flatten by grouping every planned move on the pair `(destination directory, basename lowercased)`. Any group with more than one member is a collision, whatever the extension or casing.

**Resolve it by renaming for meaning, never with an explicit extension in the import.** `domain/cart.ts` became `cart-operations.ts` because that is what the file holds — pure cart operations — next to the `Cart.tsx` component. Writing `./cart.ts` in the import to disambiguate would "work" and would leave the trap armed for the next reader.


---

See [`BAKO.md`](../../BAKO.md) for the architecture this document elaborates on.
