# Testing

This guide elaborates on `BAKO.md`. If anything here conflicts with `BAKO.md`, `BAKO.md` wins.

## Runtime and runner

Tests run on Bun's native test runner (`bun:test`). There is no other test framework in this
project — `package.json` has no test-framework dependency beyond `bun:test` itself, `@happy-dom/global-registrator`,
and the Testing Library packages listed below.

You do not run `bun test` directly on the whole tree. You run:

```bash
bun run test       # everything
bun run test:dom   # only *.dom.spec.tsx
bun run test:node  # only *.spec.ts (src/ and scripts/)
```

All three shell out to `scripts/run-tests.ts`. Do not add a competing test entry point.

### Why `scripts/run-tests.ts` exists

If you run `bun test` across multiple spec files in one process, `mock.module()` applies globally:
a mock set up in one file's setup can leak into an unrelated file running later in the same
process, producing failures that depend on file execution order instead of on the code under
test. `scripts/run-tests.ts` avoids that by giving every spec file its own process.

The mechanism, read from the script:

1. `DEFAULT_PATTERNS` is `["src/**/*.spec.ts", "src/**/*.dom.spec.tsx", "scripts/**/*.spec.ts"]`.
   `findSpecs()` walks each pattern with `Bun.Glob(pattern).scan(".")`, collects results into a
   `Set` (dedup), and returns them sorted.
2. CLI arguments **replace** the defaults entirely (`args.length > 0 ? args : DEFAULT_PATTERNS`).
   This is exactly how `test:dom` and `test:node` are implemented — they pass their own glob
   instead of the default list — and it means `bun run scripts/run-tests.ts '<glob>'` is a valid
   ad-hoc way to run an arbitrary subset.
3. `runSpec()` spawns `bun test <file>` as its own child process per spec (`Bun.spawn`), with
   `stdout`/`stderr` piped and buffered.
4. `main()` runs specs **sequentially**, one process at a time, printing `✓`/`✗` per file as it
   goes. Output for passing specs is discarded; output for failing specs is buffered and dumped
   at the end, after the pass/fail summary line. The process exits `1` if any spec failed.

Practical consequences:

- Every spec file is isolated from every other — no cross-file mock or module-state bleed.
- The suite is slower than a single-process run would be, because each file pays Bun's startup
  cost separately. That is the accepted tradeoff for isolation.
- Running `bun test <single-file>` directly is fine — it's what the runner itself does per file.
  The rule is: never run `bun test` (no argument, or a glob matching many files) directly, because
  that reintroduces the shared-process problem the runner exists to avoid.

## Global setup: `bunfig.toml` → `src/test/setup-bun.ts`

`bunfig.toml` has exactly one section:

```toml
[test]
preload = ["./src/test/setup-bun.ts"]
```

That preload script runs before every spec file, in every spawned `bun test <file>` process, and
sets up:

- **DOM environment** — `GlobalRegistrator.register()` from `@happy-dom/global-registrator`,
  registered unconditionally so both `.spec.ts` and `.dom.spec.tsx` files get a `document`/`window`
  global. `globalThis.IS_REACT_ACT_ENVIRONMENT = true` is set right after, because React Testing
  Library requires the environment to explicitly mark itself as `act()`-compatible when it isn't
  running under a test framework that does this for you automatically.
- **`ResizeObserver` polyfill** — a no-op class (`observe`/`unobserve`/`disconnect`) assigned to
  `globalThis.ResizeObserver`, because Radix UI components call it and happy-dom doesn't implement
  it.
- **Testing Library wiring** — `@testing-library/jest-dom/matchers` extends `expect`, and
  `@testing-library/react`'s `cleanup` is imported for use in `afterEach`. Both are loaded with
  **dynamic `await import(...)`, not static imports**. This is a hard ordering constraint: happy-dom
  must be registered before either package is evaluated, and a static `import` at the top of the
  file gets hoisted above `GlobalRegistrator.register()`, breaking DOM tests. Do not "clean up" these
  into static imports.
- **Per-test hooks** —
  ```ts
  beforeEach(() => {
    mock.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
  });
  ```
  Every mock created with `bun:test`'s `mock()` gets its call history cleared before each test, and
  its implementation restored after each test. You do not need to clear or restore mocks by hand in
  individual specs.

### The `[run] bun = true` anti-pattern

`bunfig.toml` carries a comment: only the `[test]` section is permitted, and `[run] bun = true`
must never be added. The repo does not document what `[run] bun = true` would break — the rule is
stated, not derived from an observed failure in this codebase. Treat it as a hard constraint:
if you find yourself wanting to add a `[run]` section, stop and raise it instead of adding it.

## Naming convention

| Pattern | Meaning | Environment |
|---|---|---|
| `*.spec.ts` | Unit test, no DOM | Node-like (happy-dom is still registered globally by the preload, but these specs don't render components) |
| `*.dom.spec.tsx` | Component test | happy-dom + `@testing-library/react` |

This maps directly to the three `package.json` scripts:

```json
"test": "bun run scripts/run-tests.ts",
"test:dom": "bun run scripts/run-tests.ts 'src/**/*.dom.spec.tsx'",
"test:node": "bun run scripts/run-tests.ts 'src/**/*.spec.ts' 'scripts/**/*.spec.ts'"
```

`test:node` covers both `src/**/*.spec.ts` and `scripts/**/*.spec.ts` — `scripts/` has its own
specs (e.g. `scripts/seed.spec.ts`) alongside the module specs under `src/`.

### Where a spec lives, and why `test/` is still legal

Specs are co-located next to the file they cover — a module's pure logic lives in `<feature>.ts`
next to `<feature>.spec.ts`. Specs are never gathered into a separate `test/` tree.

A `test/` folder inside a module is legal all the same, because it holds something else:
`@/modules/menu/test/factories` is fine — factories are shared test helpers, not tests. The rule
constrains where a spec lives; it does not ban the folder name. The app-level `src/test/`
(`setup-bun.ts`, `test-utils.tsx`, `matchers.d.ts`) is the same case one level up.

## The locale-completeness guard

`src/i18n/locale-completeness.spec.ts` is a permanent guard, not a regular feature test. Its
real mechanism, read from the file, is narrower than "every key propagates everywhere" — know the
limit before relying on it:

- It only checks a fixed list of **7 `{bundleKey, namespace}` pairs** declared in
  `NAMESPACES_TO_CHECK` (e.g. `settings.modifierGroups`, `menu.customizationDialog`,
  `errors.menu`, `checkout.errors`, ...). A new key added anywhere in a locale file **outside**
  those specific namespaces is invisible to this test.
- For each of the 5 locales (`en-US`, `es-AR`, `es-ES`, `es-MX`, `pt-BR`), every namespace file is
  imported statically as JSON, so the test itself is fully type-checked.
- Three checks run per namespace:
  1. **Presence** — the namespace exists as an object in every locale.
  2. **Key superset** — `es-MX` is the canonical locale (`CANONICAL_LOCALE`). Its keys are
     flattened (dot-path, recursive) per namespace, and every other locale must contain at least
     that same flat key set. Missing keys fail with the exact dot-path list.
  3. **Non-empty values** — every value in every non-canonical locale must be a non-empty,
     trimmed string. This catches the common copy-paste mistake of leaving the key itself as the
     value.

**What this means for you as a contributor:** if you add a new key inside one of the 7 tracked
namespaces in `es-MX`, this test fails for every other locale until you add the matching key there
too. If you add a namespace that isn't in `NAMESPACES_TO_CHECK`, add it to that list — otherwise
new keys in that namespace can silently go untranslated with the suite staying green.

## What changes require a new regression test

Following the same priorities as `BAKO.md`'s testing philosophy: not every change needs a new
test, but these categories do, because a silent regression there has real cost:

- **Business calculations and money handling** — pricing, totals, cash movements. Prices are
  integer cents (ADR-0001); a test should assert on the cent value, not a floating-point
  approximation.
- **Validation and domain-error translation** — anywhere user input is rejected, or a domain error
  crosses into the UI boundary (ADR-0002 requires translation there, never a raw `error.message`).
- **Persistence and migrations** — anything that touches Drizzle repositories or depends on schema
  shape. A migration, once applied, is immutable — write the regression test against the behavior
  it enables, not against the SQL file.
- **Permission and authorization checks** — any code path that decides whether an operation is
  allowed.
- **Native/Tauri command boundaries** — command handlers and anything validating input crossing
  the JS ↔ Rust boundary.
- **Bugs with real regression risk** — when you fix a production bug, the fix ships with a test
  that fails on the old code and passes on the new one. See the debugging protocol in `BAKO.md` /
  the project's `AGENTS.md`: reproduce first, then write the fix, then the regression test.

Pure functions are cheap to test — prefer testing them directly over testing through a component.
UI tests (`*.dom.spec.tsx`) are for user-facing interaction flows, not for re-testing logic that
already has a unit test.

## TDD

Bako's TDD posture is not restated here. It is defined once, in
[`BAKO.md` § Testing](../../BAKO.md#testing): Red, Green, Refactor is mandatory for new behavior,
and the Red phase is observed rather than assumed.
