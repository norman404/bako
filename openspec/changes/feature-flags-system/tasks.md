# Tasks: Feature Flags System

## Phase 1: Database Foundation

- [ ] 1.1 Create `src-tauri/migrations/0007_feature_flags.sql` with `feature_flags` table (`key TEXT PK`, `value TEXT`, `updated_at INTEGER`) and insert initial rows (`categories_enabled='false'`, `multiple_menus_enabled='false'`)
- [ ] 1.2 Create `src-tauri/migrations/0008_menus.sql` with `menus` table (`id TEXT PK`, `name TEXT`, `is_default INTEGER`, `created_at INTEGER`, `updated_at INTEGER`), add `menu_id TEXT` to `categories` and `products`, create default menu, assign all existing records to it
- [ ] 1.3 Modify `src-tauri/src/lib.rs`: register migrations 7 and 8 in `migrations` vec
- [ ] 1.4 Modify `src/shared/db/schema.ts`: add `featureFlags` table schema, add `menus` table schema, add `menuId` FK to `categories` and `products` schemas

## Phase 2: Feature Flags Module (Domain → Persistence → Hooks)

- [ ] 2.1 Create `src/modules/feature-flags/domain/feature-flag-key.ts`: export `FeatureFlagKey` const object and type
- [ ] 2.2 Create `src/modules/feature-flags/domain/feature-flag.ts`: export `FeatureFlag` interface
- [ ] 2.3 Create `src/modules/feature-flags/domain/errors.ts`: export `FeatureFlagDomainError` and `FeatureFlagPersistenceError` classes
- [ ] 2.4 Create `src/modules/feature-flags/domain/ports.ts`: export `FeatureFlagRepository` interface with `list()` and `update()` methods
- [ ] 2.5 Create `src/modules/feature-flags/use-cases/list-feature-flags.ts`: pure function `(repo) => repo.list()`
- [ ] 2.6 Create `src/modules/feature-flags/use-cases/update-feature-flag.ts`: pure function `(repo, key, value) => repo.update(key, value)`
- [ ] 2.7 Create `src/modules/feature-flags/persistence/feature-flag-drizzle.repository.ts`: implement `FeatureFlagRepository` with Drizzle + neverthrow
- [ ] 2.8 Create `src/modules/feature-flags/hooks/use-feature-flags.ts`: React Query hook (query key `["feature-flags"]`)
- [ ] 2.9 Create `src/modules/feature-flags/hooks/use-update-feature-flag.ts`: React Query mutation, invalidates `["feature-flags"]` on success
- [ ] 2.10 Create `src/modules/feature-flags/store/feature-flags-store.ts`: Zustand store with `flags: Record<FeatureFlagKey, boolean>`, `isLoading`, `initializeFeatureFlags()`, `get(key)`
- [ ] 2.11 Create `src/modules/feature-flags/index.ts`: public API exports

## Phase 3: Menu Domain Extensions

- [ ] 3.1 Create `src/modules/menu/domain/menu.ts`: export `Menu` interface
- [ ] 3.2 Modify `src/modules/menu/domain/ports.ts`: add `MenuRepository` interface with `list()`, `findById(id)`, `create(name)`
- [ ] 3.3 Create `src/modules/menu/use-cases/list-menus.ts`: pure function `(repo) => repo.list()`
- [ ] 3.4 Create `src/modules/menu/persistence/menu-drizzle.repository.ts`: implement `MenuRepository` with Drizzle
- [ ] 3.5 Modify `src/modules/menu/persistence/product-drizzle.repository.ts`: update `list()` to accept optional `menuId` filter
- [ ] 3.6 Modify `src/modules/menu/persistence/category-drizzle.repository.ts`: update `list()` to accept optional `menuId` filter
- [ ] 3.7 Create `src/modules/menu/hooks/use-menus.ts`: React Query hook (query key `["menu", "menus"]`)
- [ ] 3.8 Modify `src/modules/menu/hooks/use-products.ts`: read `multiple_menus_enabled` from store; if ON, filter by `selectedMenuId` from `usePosStore`
- [ ] 3.9 Modify `src/modules/menu/hooks/use-categories.ts`: read `multiple_menus_enabled` from store; if ON, filter by `selectedMenuId` from `usePosStore`

## Phase 4: UI Integration

- [ ] 4.1 Modify `src/modules/pos/store/pos-store.ts`: add `selectedMenuId: string | null` and `setSelectedMenuId(id)` action
- [ ] 4.2 Create `src/modules/menu/components/MenuSelector.tsx`: dropdown to select active menu, updates `usePosStore.selectedMenuId`
- [ ] 4.3 Create `src/modules/settings/components/FeatureFlagsPanel.tsx`: render toggle switches for each flag, calls `useUpdateFeatureFlag()` on change
- [ ] 4.4 Modify `src/modules/settings/components/SettingsModal.tsx`: add `SETTINGS_SECTION.FEATURES = "features"` and render `<FeatureFlagsPanel />` in tab
- [ ] 4.5 Modify `src/app/App.tsx`: read `categories_enabled` and `multiple_menus_enabled` from `useFeatureFlagsStore()`, conditionally render `<CategoryNav />` and `<MenuSelector />`
- [ ] 4.6 Modify `src/main.tsx`: call `useFeatureFlagsStore.getState().initializeFeatureFlags()` after `initializeSettings()` in bootstrap

## Phase 5: Tests (TDD — Red → Green)

- [ ] 5.1 Test: `src/modules/feature-flags/domain/feature-flag.spec.ts` — verify `FeatureFlag` type and `FeatureFlagKey` enum structure
- [ ] 5.2 Test: `src/modules/feature-flags/use-cases/list-feature-flags.spec.ts` — verify pure function delegates to repo
- [ ] 5.3 Test: `src/modules/feature-flags/use-cases/update-feature-flag.spec.ts` — verify pure function delegates to repo with correct args
- [ ] 5.4 Test: `src/modules/feature-flags/hooks/use-feature-flags.dom.spec.tsx` — mock repo, verify hook returns flags from DB
- [ ] 5.5 Test: `src/modules/feature-flags/hooks/use-update-feature-flag.dom.spec.tsx` — verify mutation calls repo and invalidates query
- [ ] 5.6 Test: `src/modules/feature-flags/store/feature-flags-store.spec.ts` — verify `initializeFeatureFlags()` loads DB flags into store, `get(key)` returns value
- [ ] 5.7 Test: `src/modules/settings/components/FeatureFlagsPanel.dom.spec.tsx` — render panel, toggle switch, verify mutation call
- [ ] 5.8 Test: `src/app/App.dom.spec.tsx` — mock `useFeatureFlagsStore`, verify `<CategoryNav />` visibility when `categories_enabled` is ON/OFF
- [ ] 5.9 Test: `src/app/App.dom.spec.tsx` — verify `<MenuSelector />` visibility when `multiple_menus_enabled` is ON/OFF
- [ ] 5.10 Test: `src/modules/menu/hooks/use-products.dom.spec.tsx` — verify menu filtering when `multiple_menus_enabled` is ON
- [ ] 5.11 Test: `src/modules/menu/hooks/use-categories.dom.spec.tsx` — verify menu filtering when `multiple_menus_enabled` is ON
- [ ] 5.12 Test: `src/modules/menu/components/MenuSelector.dom.spec.tsx` — render selector, select menu, verify `setSelectedMenuId` call

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | 4 | Database migrations and schema |
| Phase 2 | 11 | Feature flags module (Clean Architecture) |
| Phase 3 | 9 | Menu domain extensions and scoping |
| Phase 4 | 6 | UI integration and bootstrap |
| Phase 5 | 12 | Tests (TDD verification) |
| **Total** | **42** | |
