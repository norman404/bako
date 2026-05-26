# Proposal: feature-flags-system

## Intent

Implement a Feature Flags system in the Bako POS that allows administrators to enable/disable functionality from an admin panel. This enables gradual rollout of new features (multiple menus, category browsing) and simplifies the UI when features are disabled.

## Scope

### In Scope
- New `feature_flags` SQLite table and migration (0007).
- Domain entity `FeatureFlag`, repository port, use-cases (list/update).
- Drizzle repository implementation.
- Zustand store + React Query hooks for reading/writing flags.
- New "Features" tab in SettingsModal with toggle switches.
- `categories_enabled` flag: when OFF, hide CategoryNav and show all products unfiltered.
- `multiple_menus_enabled` flag: when ON, introduce Menu entity (DB table `menus`), show menu selector in menu view; when OFF, behave as today with implicit single menu.
- Migration 0008 for `menus` table with FKs from `categories` and `products`.
- Update App.tsx and menu components to react to flag states.
- Bootstrap integration: load flags on app start.
- Unit tests for domain, use-cases, hooks; DOM tests for new UI panel.

### Out of Scope
- Role-based access control (who can toggle flags).
- Feature flags for non-menu modules (checkout, pos, turno).
- A/B testing or percentage rollouts.
- Remote flag management (cloud API).
- Migration of existing data into menus (manual or automatic migration scripts beyond default menu creation).

## Capabilities

### New Capabilities
- `feature-flag-management`: CRUD-like toggle of feature flags from admin panel, persisted to DB.
- `conditional-category-browsing`: CategoryNav and product filtering reacts to `categories_enabled` flag.
- `conditional-multiple-menus`: Menu selector and menu-scoped categories/products react to `multiple_menus_enabled` flag.

### Modified Capabilities
- `system-settings`: Extend admin modal with a new "Features" tab.
- `menu-browsing`: App.tsx/menu UI behavior changes based on active flags.

## Approach

1. **Database Layer**: Create migrations 0007 (`feature_flags` table) and 0008 (`menus` table + FKs to categories/products). Register in `lib.rs`.
2. **Domain Layer**: Create `feature-flags` module following Clean Architecture pattern (same as menu module): domain entities, ports, use-cases, persistence, hooks.
3. **State Management**: Zustand store for synchronous UI reads; React Query for mutations.
4. **Bootstrap**: Extend `main.tsx` to hydrate feature flags store after settings initialization.
5. **UI Integration**: Add "Features" tab to SettingsModal with toggle switches. Update App.tsx, CategoryNav, ProductGrid to react to flag states.
6. **Menu Scoping**: When `multiple_menus_enabled` is ON, show menu selector; categories and products are scoped by selected menu. When OFF, use implicit "default" menu.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/db/schema.ts` | Modified | Add `feature_flags` and `menus` tables; add FKs to categories/products |
| `src-tauri/migrations/` | New | `0007_feature_flags.sql`, `0008_menus.sql` |
| `src-tauri/src/lib.rs` | Modified | Register migrations 7 and 8 |
| `src/modules/settings/` | Modified | Add Features panel, update SettingsModal tabs |
| `src/modules/menu/` | Modified | App.tsx, CategoryNav, ProductGrid react to flags; new menu hooks/components |
| `src/modules/feature-flags/` | New | Domain, ports, use-cases, persistence, hooks, store |
| `src/main.tsx` | Modified | Bootstrap: hydrate feature flags store |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing menu browsing for current users | Medium | `multiple_menus_enabled` default OFF; existing data treated as default menu |
| Schema migration conflicts (users already on v6) | Low | New sequential migrations (0007, 0008) never modify existing files |
| UI complexity in App.tsx with many conditional branches | Medium | Extract flag-aware layout into small sub-components |
| Tests become flaky due to Zustand store state leaking | Medium | Reset store in test setup; use test doubles for DB |

## Rollback Plan

- Revert migrations 7 & 8 (they are additive only — no destructive changes, safe to leave).
- Remove feature flag checks from UI components (revert to original behavior).
- Delete new module files.
- Keep DB columns/tables unused (no data loss).

## Success Criteria

- [ ] Admin can open SettingsModal → Features tab and toggle `categories_enabled` and `multiple_menus_enabled`.
- [ ] Toggling `categories_enabled` OFF immediately hides CategoryNav and shows all products in App.tsx.
- [ ] Toggling `multiple_menus_enabled` ON shows a menu selector; categories and products are scoped by selected menu.
- [ ] Toggling `multiple_menus_enabled` OFF reverts to single-menu view (existing behavior).
- [ ] All existing tests pass; new tests for feature flag domain, hooks, and UI pass.
- [ ] No TypeScript or lint errors.
