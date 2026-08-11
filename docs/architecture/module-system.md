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

The plan left this one destination open, to be resolved by reading the file. Read in full, `pos-store.ts` holds exactly four pieces of state:

- `selectedCategory` — the active category filter for browsing the menu.
- `isCheckoutOpen` + `checkoutSessionKey` — whether the checkout flow is open, plus a counter that forces a fresh session each time it reopens.
- `isMobileCartOpen` — whether the mobile cart drawer is open.
- `isSettingsOpen` — whether the Settings modal is open.

None of this is order or cart *data* — there is no line item, no total, no order id in the store. It is visibility/toggle state for panels that belong to four different modules: `menu` (category filter), `checkout` (checkout modal), `settings` (settings modal), and the mobile cart drawer that lives at the app-shell level. Putting it in `src/modules/order/` would mean `settings` and `menu` components importing `@/modules/order` just to toggle a settings modal or read a category filter that has nothing to do with orders — a coupling that doesn't match what the state actually is.

**Decision: `pos-store.ts` moves to a new module, `src/modules/pos/`.** Bako has a single POS screen (no routing) and this store is the view-state of that screen: which overlay is showing and which category is being browsed. It is the one case in the module map where the state is genuinely cross-cutting screen orchestration rather than a feature domain — consistent with terax not having global stores: the store still lives inside a module, just not inside `order`, `checkout`, `settings`, or `menu`, because it isn't about any one of them specifically.

---

## 2. Module shape

The shape is in [`BAKO.md` § Module system](../../BAKO.md#module-system), and the layers it replaced are listed in [`BAKO.md` § Layers that do not exist in this model](../../BAKO.md#layers-that-do-not-exist-in-this-model). The rules a structural change is checked against in review are in [`BAKO.md` § Migration strategy](../../BAKO.md#migration-strategy); the step-by-step procedure is §7 below.

### `test/` is the one subfolder a small module may have

`components/` and `lib/` appear only when a module's size justifies them. `test/` is the exception: **`test/factories.ts` inside a module is legal at any size**, because factories are shared test *helpers*, not tests. The specs themselves stay co-located next to the file they cover — Bako does not group tests into a separate `test/` tree. See [`docs/contributing/testing.md`](../contributing/testing.md).

### `test/factories` is the second documented exception to the barrel

Factories are deep-imported across module lines — `@/modules/menu/test/factories` by `checkout`, `order`, `shift-reports` and `src/app/App.dom.spec.tsx`; `@/modules/printer/test/factories` by `checkout` and `shift-reports`; `@/modules/order/test/factories` by `checkout`. Those are deep paths, so the barrel rule (§3) reaches them.

**Decision: `test/factories` is a documented exception to the barrel rule, alongside `manifest.ts` — not something to re-export from `index.ts`.** The permitted form is `@/modules/<module>/test/factories`, and it may be imported **only from a spec, or from another module's `test/factories`** — the second case because a factory legitimately composes another (`order/test/factories.ts` builds a `CartItem` from `menu`'s `buildProduct`). No production file imports one. Modules that publish factories today: `menu`, `order`, `printer`.

Two reasons:

- **A factory is not public API.** It builds fixtures for tests. Nothing in production has any business constructing one, and putting it in `index.ts` would advertise it as part of the module's contract.
- **The barrel is loaded by production code.** Re-exporting factories through `index.ts` would drag test-only code — and whatever it imports — into the bundle every consumer of that module pulls in. `src/i18n/index.ts` is the worked example of what that costs: it re-exports test helpers, so `@testing-library/react` reaches the bundle through `main.tsx`. The barrel is not a free indirection; whatever it names, it loads.

The two exceptions and their allowed call sites are summarized in §5.

---

## 3. The barrel rule

The rule is in [`BAKO.md` § The barrel is the boundary](../../BAKO.md#the-barrel-is-the-boundary). All ten modules satisfy it: every cross-module import outside the owning module resolves either to `@/modules/<module>` or to one of the two exceptions below. There is no third form, and a new one is a review failure, not a precedent.

This guide adds exactly two exceptions to the rule, both documented and both bounded by call site: `manifest.ts` (§5) and `test/factories` (§2, summarized in §5).

---

## 4. The `settings` ↔ `updater` cycle — resolved

**This cycle no longer exists.** It is documented here because the reasoning that removed it is the reasoning the next module migration will need, not because there is anything left to fix.

### What the cycle was

Two edges, both facts about the code as it stood:

- `src/modules/settings/components/SettingsModal.tsx:12` imported `UpdateSettingsPanel` directly: `import { UpdateSettingsPanel } from "@/modules/updater/components/UpdateSettingsPanel";`
- `src/modules/updater/manifest.ts:2` imported the type contract from settings: `import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";`

The old `updater/README.md` claimed "`settings` NUNCA importa este módulo." The code contradicted it.

There already was a mechanism built to prevent exactly this: `src/app/module-registry.ts` builds `MODULE_REGISTRY: ModuleManifest[]` by importing every module's `manifest.ts` and handing the array to `SettingsModal` as a prop. `updaterManifest` already carried `settingsPanel: UpdateSettingsPanel` inside that array — the registry entry for `updater` already *was* the reference `SettingsModal` needed.

`SettingsModal.tsx` received that full registry, then did this: it filtered `manifest.id === "updater"` **out** of the generic module-tabs loop (comment: "Updater is now in the general group"), and instead hand-built an equivalent tab in `generalTabs` by importing `UpdateSettingsPanel` again, directly, by path. The registry already held the exact component reference; the direct import duplicated data the registry already carried, and that duplication was the entire cycle.

### What was decided, and why

**The registry was the correct mechanism. The direct import in `SettingsModal.tsx` was the violation to remove — not the registry to replace.** This is the part worth keeping: the cycle was not evidence that registration-by-manifest is the wrong design. It was evidence that one call site had bypassed a mechanism that already solved its problem.

### What it looks like now

`SettingsModal.tsx` reads the panel off the matching registry entry instead of importing the component by path:

```ts
const updaterPanel = registry.find((manifest) => manifest.id === "updater")?.settingsPanel;
```

The tab still lands in the "general" group, exactly where it was. There is deliberately no fallback: if the manifest ever stops carrying a panel, the tab disappears rather than quietly rendering something else. That removed the `settings → updater` edge entirely — `rg "modules/updater" src/modules/settings/` now returns nothing.

`updater/manifest.ts` keeps its edge to the `ModuleManifest` contract `settings` owns, and that is correct: it is one-directional and type-only — a module depending on a contract, not a cycle. Do not "fix" it.

---

## 5. The two exceptions to the barrel rule

There are exactly two, no more, and each is bounded by *who* may use it:

| Exception | Permitted import | Permitted call site |
|---|---|---|
| `manifest.ts` | `@/modules/<module>/manifest` | `src/app/module-registry.ts` only |
| `test/factories` | `@/modules/<module>/test/factories` | specs, and other modules' `test/factories` |

Anything else that reaches past an `index.ts` is a violation. Adding a third exception is an architectural decision, not a judgment call at the call site.

### `manifest.ts`

The `manifest.ts` files (`menu`, `checkout`, `delivery`, `printer`, `shift-reports`, `updater`) are imported by deep path from `src/app/module-registry.ts` — e.g. `@/modules/delivery/manifest` — never through a barrel. If the barrel is the only boundary (§3), this is a real exception, not an oversight to silently allow.

**Decision: `manifest.ts` is a documented exception to the barrel rule, not something to re-export from `index.ts`.** It may be deep-imported as `@/modules/<module>/manifest`, and exclusively from `src/app/module-registry.ts` — the one composition root responsible for wiring modules into the Settings registry. No other file gets a pass to import a module's `manifest.ts` by path.

Reason: `module-registry.ts` runs at app composition time and needs only the manifest object (an id, some flags, a component reference) for every module, up front. If `manifest` were re-exported through `index.ts` instead, registering a module would force loading its entire public barrel — components, stores, repository code, everything else that module exports — just to read a handful of metadata fields. That's needless weight at boot, and it's exactly the kind of eager cross-loading that produces cycles like §4's: two modules' barrels pulling on each other transitively through registration alone, not through any real feature dependency.

### `test/factories`

Decided in [§2](#2-module-shape), where the reasoning lives — factories are test helpers rather than public API, and routing them through the barrel would pull test-only code into the production bundle. Not repeated here.

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

`updater` was the pilot. Its one structural blocker was the cycle in §4, resolved as part of the migration rather than before it. The procedure then ran to completion across the rest of the repo: **all ten modules are in the flat shape, no layer folders remain anywhere under `src/modules/`, and every cross-module import goes through a barrel or one of the two exceptions in §5.** The five steps above are not a proposal and not a historical record — they are the procedure for the next module that needs restructuring, and for checking that a new module was born in the right shape.

### Two traps the migration hit

Both cost real debugging time and neither is obvious from the five steps. They apply to any future flattening.

#### 1. Flattening collides files, and the case-only collisions are silent

Files from different layer folders land in the same directory, so two of them can claim the same name. There are two flavors:

- **Exact.** `domain/print-ticket.ts` and `components/print-ticket.ts` in `checkout` both want `checkout/print-ticket.ts`. Loud — the second `git mv` overwrites, or the tooling complains.
- **Case-only.** `domain/cart.ts` and `components/Cart.tsx` in `order` both want `order/cart.*`. This one is silent and dangerous. On a case-insensitive filesystem both files answer to `./cart`, and the two toolchains disagree about which one wins: **Bun resolves `.tsx` before `.ts`, TypeScript resolves the other way.** The same import specifier then loads a *different file* at runtime than the one the typechecker validated — and `bun run build` still passes, because each tool is internally consistent. Nothing in the gate catches it.

**Do this before moving anything:** simulate the flatten by grouping every planned move on the pair `(destination directory, basename lowercased)`. Any group with more than one member is a collision, whatever the extension or casing.

**Resolve it by renaming for meaning, never with an explicit extension in the import.** `domain/cart.ts` became `cart-operations.ts` because that is what the file holds — pure cart operations — next to the `Cart.tsx` component. Writing `./cart.ts` in the import to disambiguate would "work" and would leave the trap armed for the next reader.

#### 2. Repointing a spec at the barrel breaks partial `mock.module` factories

Step 4 turns a spec's deep import into a barrel import, and the spec's mocks have to follow. Two failure modes, both of which show up as `undefined is not a function` in code that was passing a minute earlier:

- **A partial factory blanks the rest of the module.** `mock.module("@/modules/x", () => ({ useThing }))` replaces the whole namespace. If the code under test also uses `otherThing` from that barrel, it now reads `undefined`. Under a deep import each symbol had its own module to mock, so the problem could not arise.
- **Two `mock.module` calls on the same target do not merge — the last one wins.** Specs that mocked two deep paths separately must consolidate into a *single* factory for the barrel.

The pattern is to spread the real module and override only what the test controls:

```ts
import * as menuModule from "@/modules/menu";

// Snapshot of the real module BEFORE mocking it: the barrel also exports
// parseProductPriceInput, which the component needs at its real value.
const realMenuModule = { ...menuModule };

const useCategoriesMock = mock();
mock.module("@/modules/menu", () => ({
  ...realMenuModule,
  useCategories: useCategoriesMock,
}));
```

The snapshot must be taken **before** `mock.module` runs. Bun mutates the existing namespace object in place, so a spread taken afterwards copies the mock, not the real module, and every "preserved" symbol comes back `undefined`. `src/modules/shift-reports/components/ShiftControlPanel.dom.spec.tsx` is the worked example in the tree.

---

See [`BAKO.md`](../../BAKO.md) for the architecture this document elaborates on.
