# Spec: feature-flag-management

## Overview

The system SHALL provide a feature flag management capability that allows administrators to toggle feature switches from within the application, persisting these settings to the SQLite database and applying them immediately without requiring an app restart.

## Requirements

### Persistence
- The system MUST persist feature flags in a dedicated `feature_flags` SQLite table.
- Each feature flag MUST have a unique `key` (string), a `enabled` boolean value, and optional `description` text.
- The system MUST support at least two feature flags initially: `categories_enabled` and `multiple_menus_enabled`.
- All feature flags MUST default to `false` (OFF) unless explicitly enabled by the admin.

### Admin Interface
- The system MUST provide an admin interface inside the SettingsModal to toggle each feature flag on/off.
- The admin interface MUST be accessible via a "Features" tab in the SettingsModal.
- Each feature flag MUST be presented as a toggle switch with a clear label and optional description.
- Toggle switches MUST reflect the current state of the feature flag from the database.

### Real-time Updates
- Changes to feature flags MUST take effect immediately in the UI without requiring an app restart.
- The system MUST load feature flags from the database during app bootstrap and keep them in a synchronous store (Zustand) for fast UI reads.
- Flag state changes MUST trigger UI re-renders in components that depend on those flags.

### Architecture
- The system MUST follow Clean Architecture: domain entities, ports, use-cases, persistence layer (Drizzle), and hooks.
- The `feature-flags` module MUST expose a Zustand store for synchronous reads and React Query mutations for writes.
- All feature flag state MUST be loaded into the Zustand store during app bootstrap (in `main.tsx`).

## Scenarios

### Scenario: Admin enables a feature flag
**Given** the admin opens the SettingsModal and navigates to the "Features" tab  
**And** the `categories_enabled` flag is currently OFF  
**When** the admin toggles the `categories_enabled` switch to ON  
**Then** the system persists `enabled=true` for `categories_enabled` to the database  
**And** the Zustand store is updated immediately  
**And** the menu UI shows the CategoryNav component without requiring a restart

### Scenario: Admin disables a feature flag
**Given** the `categories_enabled` flag is currently ON  
**And** the CategoryNav is visible in the menu view  
**When** the admin toggles the `categories_enabled` switch to OFF in the Settings modal  
**Then** the system persists `enabled=false` for `categories_enabled` to the database  
**And** the CategoryNav disappears from the menu view immediately

### Scenario: App boots with no flags in the database
**Given** the app is launched for the first time (empty `feature_flags` table)  
**When** the app bootstraps and loads feature flags  
**Then** all feature flags default to `false` (OFF)  
**And** the Zustand store contains all flags with `enabled=false`  
**And** the UI starts in simplified mode (no CategoryNav, no menu selector)

### Scenario: App boots with flags enabled
**Given** the database contains `multiple_menus_enabled=true`  
**When** the app bootstraps and hydrates the feature flags store  
**Then** the Zustand store contains `multiple_menus_enabled=true`  
**And** the menu selector appears in the menu view after bootstrap

### Scenario: Feature flag read performance
**Given** multiple components read the same feature flag on every render  
**When** the UI renders 100+ product cards, each checking `categories_enabled`  
**Then** the feature flag read MUST be synchronous (from Zustand, not async DB query)  
**And** no performance degradation occurs compared to a hardcoded boolean check

## Constraints

- Feature flag keys MUST be unique and immutable (changing a key is equivalent to creating a new flag).
- The system MUST NOT expose feature flags to non-admin users (no UI element for toggling).
- Feature flags MUST be loaded synchronously after database initialization to avoid race conditions during bootstrap.
- Removing a feature flag from code SHOULD leave the database row intact (no automatic cleanup).

## Acceptance Criteria

- [ ] Admin can open SettingsModal → Features tab and see a list of all registered feature flags.
- [ ] Admin can toggle any flag on/off, and the change persists to the database immediately.
- [ ] UI components that depend on a flag re-render immediately when the flag changes.
- [ ] App boots with an empty `feature_flags` table and defaults all flags to OFF.
- [ ] App boots with existing flags in the database and loads them into the Zustand store before rendering.
- [ ] Unit tests verify domain logic (FeatureFlag entity, use-cases).
- [ ] DOM tests verify the Features panel toggle UI works correctly.
