# Design: Feature Flags System

## Technical Approach

Implement a feature flag system following Clean Architecture. Create a new `feature-flags` module with domain entities, ports, use-cases, and Drizzle persistence. Use Zustand for synchronous reads (same pattern as `settings-store.ts`) and React Query for mutations. Extend `menu` module with `Menu` entity and repository for multi-menu support. Add two flags: `categories_enabled` (hide CategoryNav when OFF) and `multiple_menus_enabled` (show menu selector when ON, scope categories/products by menu). Bootstrap loads flags into store after settings initialization.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feature flags storage | SQLite table `feature_flags` with `key TEXT PK, value TEXT, updated_at INTEGER` | SQLite has no boolean type; project already uses `"true"`/`"false"` strings for booleans (see `schema.ts:29` — `is_popular` uses `{ mode: "boolean" }` which maps to 0/1 integers). We store as TEXT for flexibility and consistency with settings pattern. |
| Multiple menus data model | New table `menus` + nullable FKs `menu_id` in `categories` and `products` | Nullable FKs allow migration safety (existing data has NULL initially); default menu created in migration 0008; app logic treats NULL as implicit default menu. |
| Feature flags module state | Zustand store + React Query hooks | Same pattern as `settings-store.ts`: Zustand for synchronous UI reads, React Query for async mutations and server sync. |
| Menu scoping logic | Filter in hooks (`use-products`, `use-categories`) when `multiple_menus_enabled` is ON | Keep App.tsx clean; hooks return menu-scoped data when flag is active. Falls back to "default" menu (first created) when OFF. |
| Bootstrap sequence | `initDatabase()` → `initializeSettings()` → `initializeFeatureFlags()` → `initI18n()` | Feature flags depend on DB; must load before rendering App.tsx (which reads flags synchronously from store). |

## Data Flow

```
App.tsx
  │
  ├─→ useFeatureFlagsStore() ──(sync)──→ Zustand store ←──(hydrate)── initializeFeatureFlags() ←── DB
  │
  ├─→ useProducts() ──→ React Query ──→ listProducts use-case ──→ ProductRepository (Drizzle)
  │
  └─→ CategoryNav (renders only if categories_enabled === true)
      MenuSelector (renders only if multiple_menus_enabled === true)
```

SettingsModal → FeatureFlagsPanel → useUpdateFeatureFlag() → React Query mutation → DB → invalidates store

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/migrations/0007_feature_flags.sql` | Create | Create `feature_flags` table; insert initial rows for `categories_enabled` and `multiple_menus_enabled` (both `'false'`). |
| `src-tauri/migrations/0008_menus.sql` | Create | Create `menus` table; add `menu_id` column to `categories` and `products`; create default menu; assign all existing categories/products to it. |
| `src-tauri/src/lib.rs` | Modify | Register migrations 7 and 8 in `migrations` vec. |
| `src/shared/db/schema.ts` | Modify | Add `featureFlags` and `menus` table schemas; add `menuId` FK to `categories` and `products`. |
| `src/modules/feature-flags/domain/feature-flag.ts` | Create | `type FeatureFlag = { key: FeatureFlagKey; value: boolean; updatedAt: Date }` |
| `src/modules/feature-flags/domain/feature-flag-key.ts` | Create | `const FeatureFlagKey = { CATEGORIES_ENABLED: 'categories_enabled', MULTIPLE_MENUS_ENABLED: 'multiple_menus_enabled' } as const` |
| `src/modules/feature-flags/domain/errors.ts` | Create | `FeatureFlagDomainError`, `FeatureFlagPersistenceError` classes. |
| `src/modules/feature-flags/domain/ports.ts` | Create | `interface FeatureFlagRepository { list(), update(key, value) }` |
| `src/modules/feature-flags/use-cases/list-feature-flags.ts` | Create | Pure function: `(repo) => repo.list()` |
| `src/modules/feature-flags/use-cases/update-feature-flag.ts` | Create | Pure function: `(repo, key, value) => repo.update(key, value)` |
| `src/modules/feature-flags/persistence/feature-flag-drizzle.repository.ts` | Create | Implements `FeatureFlagRepository` using Drizzle + neverthrow. |
| `src/modules/feature-flags/hooks/use-feature-flags.ts` | Create | React Query hook for reading flags (query key: `["feature-flags"]`). |
| `src/modules/feature-flags/hooks/use-update-feature-flag.ts` | Create | React Query mutation for updating a flag; invalidates query on success. |
| `src/modules/feature-flags/store/feature-flags-store.ts` | Create | Zustand store with `flags: Record<FeatureFlagKey, boolean>`, `initializeFeatureFlags()`, `get(key)`. Same pattern as `settings-store.ts`. |
| `src/modules/feature-flags/index.ts` | Create | Public API: export types, hooks, store. |
| `src/modules/menu/domain/menu.ts` | Create | `type Menu = { id: string; name: string; isDefault: boolean; createdAt: Date; updatedAt: Date }` |
| `src/modules/menu/domain/ports.ts` | Modify | Add `MenuRepository` interface with `list()`, `findById(id)`, `create(name)`. |
| `src/modules/menu/use-cases/list-menus.ts` | Create | `(repo) => repo.list()` |
| `src/modules/menu/persistence/menu-drizzle.repository.ts` | Create | Implements `MenuRepository` with Drizzle. |
| `src/modules/menu/hooks/use-menus.ts` | Create | React Query hook (query key: `["menu", "menus"]`). |
| `src/modules/menu/hooks/use-products.ts` | Modify | Read `multiple_menus_enabled` from store; if ON, filter by `selectedMenuId` from `usePosStore`. |
| `src/modules/menu/hooks/use-categories.ts` | Modify | Same as products: filter by menu when flag is ON. |
| `src/modules/menu/components/MenuSelector.tsx` | Create | Dropdown to select active menu; updates `usePosStore.selectedMenuId`. |
| `src/modules/settings/components/FeatureFlagsPanel.tsx` | Create | Renders toggle switches for each flag; calls `useUpdateFeatureFlag()` on change. |
| `src/modules/settings/components/SettingsModal.tsx` | Modify | Add `SETTINGS_SECTION.FEATURES = "features"` and render `<FeatureFlagsPanel />` in `renderSectionPanel`. |
| `src/modules/pos/store/pos-store.ts` | Modify | Add `selectedMenuId: string \| null`, `setSelectedMenuId(id)`. |
| `src/app/App.tsx` | Modify | Read `categories_enabled` from `useFeatureFlagsStore()`; conditionally render `<CategoryNav />`. Read `multiple_menus_enabled`; conditionally render `<MenuSelector />`. |
| `src/main.tsx` | Modify | Call `useFeatureFlagsStore.getState().initializeFeatureFlags()` after `initializeSettings()` in bootstrap sequence. |

## Interfaces / Contracts

### Feature Flag Domain

```typescript
// domain/feature-flag-key.ts
export const FeatureFlagKey = {
  CATEGORIES_ENABLED: 'categories_enabled',
  MULTIPLE_MENUS_ENABLED: 'multiple_menus_enabled',
} as const;

export type FeatureFlagKey = typeof FeatureFlagKey[keyof typeof FeatureFlagKey];

// domain/feature-flag.ts
export interface FeatureFlag {
  key: FeatureFlagKey;
  value: boolean;
  updatedAt: Date;
}

// domain/ports.ts
export interface FeatureFlagRepository {
  list(): ResultAsync<FeatureFlag[], FeatureFlagPersistenceError>;
  update(key: FeatureFlagKey, value: boolean): ResultAsync<void, FeatureFlagPersistenceError>;
}
```

### Feature Flags Store (Zustand)

```typescript
// store/feature-flags-store.ts
interface FeatureFlagsState {
  flags: Record<FeatureFlagKey, boolean>;
  isLoading: boolean;
  initializeFeatureFlags: () => ResultAsync<void, never>;
  get: (key: FeatureFlagKey) => boolean;
}
```

Pattern: read all flags from DB on init; populate `flags` map; `get(key)` returns synchronous value (defaults to `false` if missing).

### Menu Domain

```typescript
// domain/menu.ts
export interface Menu {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// domain/ports.ts (extend existing file)
export interface MenuRepository {
  list(): ResultAsync<Menu[], MenuDomainError>;
  findById(id: string): ResultAsync<Menu, MenuDomainError>;
  create(name: string): ResultAsync<Menu, MenuDomainError>;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `domain/feature-flag.ts`, use-cases `list-feature-flags`, `update-feature-flag` | Pure functions, no React/DB — Vitest `.spec.ts`. |
| Unit | `domain/menu.ts`, use-case `list-menus` | Same as above. |
| Integration | `hooks/use-feature-flags.ts`, `hooks/use-update-feature-flag.ts` | React Query with mock repository — `@testing-library/react` + Vitest. |
| DOM | `FeatureFlagsPanel.tsx`, `SettingsModal.tsx` (new Features tab) | Render, toggle switches, verify mutation calls — `.dom.spec.tsx`. |
| DOM | `App.tsx` conditional rendering (CategoryNav, MenuSelector) | Mock `useFeatureFlagsStore` to return different flag states; assert presence/absence of components. |

No E2E needed — UI is simple conditional rendering.

## Open Questions

None. All patterns are established in the codebase (settings store, menu module, Drizzle repositories, React Query hooks).
