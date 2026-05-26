# Spec: system-settings (Delta)

## Overview

This is a DELTA spec. The system-settings capability is extended to include a "Features" tab in the SettingsModal where administrators can toggle feature flags.

## Requirements (ADDED)

### Features Tab
- The SettingsModal MUST include a new tab labeled "Features" (or "Funciones" in Spanish).
- The "Features" tab MUST render a list of all registered feature flags as toggle switches.
- Each feature flag toggle MUST display:
  - The flag's human-readable label (e.g., "Enable Categories" for `categories_enabled`)
  - An optional description explaining what the flag controls
  - The current state (ON/OFF) reflected in the toggle switch

### Toggle Behavior
- When the admin clicks a toggle switch, the system MUST persist the new state to the database immediately.
- The toggle switch MUST reflect the updated state after the database write completes.
- If the database write fails, the toggle switch MUST revert to its previous state and display an error message.

### Access Control
- The "Features" tab MUST be accessible only from the SettingsModal (no separate route or public UI).
- The system SHOULD assume that only authorized users can open the SettingsModal (role-based access control is out of scope for this change).

## Scenarios

### Scenario: Admin opens the Features tab
**Given** the admin opens the SettingsModal  
**When** the admin clicks the "Features" tab  
**Then** the system displays a list of all registered feature flags  
**And** each flag is shown as a toggle switch with its current state (ON or OFF)  
**And** the `categories_enabled` flag shows as OFF by default (if not previously enabled)  
**And** the `multiple_menus_enabled` flag shows as OFF by default (if not previously enabled)

### Scenario: Admin toggles a feature flag ON
**Given** the admin is viewing the "Features" tab  
**And** the `categories_enabled` toggle is currently OFF  
**When** the admin clicks the `categories_enabled` toggle  
**Then** the system persists `enabled=true` for `categories_enabled` to the database  
**And** the toggle switch updates to the ON state  
**And** the CategoryNav appears immediately in the menu view (without closing Settings)

### Scenario: Admin toggles a feature flag OFF
**Given** the `multiple_menus_enabled` flag is currently ON  
**And** the admin is viewing the "Features" tab  
**When** the admin clicks the `multiple_menus_enabled` toggle  
**Then** the system persists `enabled=false` for `multiple_menus_enabled` to the database  
**And** the toggle switch updates to the OFF state  
**And** the menu selector disappears immediately from the menu view

### Scenario: Database write fails when toggling a flag
**Given** the admin clicks the `categories_enabled` toggle to turn it ON  
**And** the database write operation fails (e.g., DB is locked or corrupted)  
**When** the mutation error is returned  
**Then** the toggle switch reverts to its previous state (OFF)  
**And** an error toast or message is displayed: "Failed to update feature flag. Please try again."

## Constraints

- The "Features" tab MUST only appear in the SettingsModal (not as a standalone page).
- The tab MUST render toggle switches dynamically based on the list of feature flags returned from the `listFeatureFlags` use-case.
- The tab MUST NOT hardcode flag keys (flags should be registered in the domain or a configuration file).
- The UI MUST use the existing SettingsModal layout and styling (tabs at the top, content below).

## Acceptance Criteria

- [ ] The SettingsModal includes a "Features" tab.
- [ ] The "Features" tab displays all registered feature flags as toggle switches.
- [ ] Each toggle reflects the current state of the feature flag from the database.
- [ ] Clicking a toggle persists the new state to the database and updates the UI immediately.
- [ ] If a database write fails, the toggle reverts and an error is shown.
- [ ] DOM tests verify that the Features panel renders correctly and toggles work.
