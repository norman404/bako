# Feature Flag Integration Specification

## Purpose
Define how the `shift_management_enabled` feature flag is declared, exposed in settings, and used to conditionally render shift management UI.

## Requirements

### Requirement: Default Feature Flag

The system MUST declare `shift_management_enabled` in the default feature flags with a default value of `false`. The flag MUST be persisted in the `feature_flags` SQLite table and initialized on app startup.

#### Scenario: Fresh app install

- GIVEN the app is launched for the first time
- WHEN the feature flags initialize
- THEN `shift_management_enabled` is present in the flags map with value `false`

#### Scenario: Flag persists across sessions

- GIVEN the user previously enabled `shift_management_enabled`
- WHEN the app restarts
- THEN the flag retains the previously set value

### Requirement: Settings Checkbox

The system MUST expose a checkbox labeled "Sistema de turnos" (es) / "Shift Management" (en) in the Feature Flags panel inside Settings. Toggling the checkbox MUST persist the new value via the existing feature flag update mechanism.

#### Scenario: Enable shift management from settings

- GIVEN the user is in the Settings > Features panel and `shift_management_enabled` is false
- WHEN the user checks the "Sistema de turnos" checkbox
- THEN the flag is updated to `true` and the UI immediately reflects the change

#### Scenario: Disable shift management from settings

- GIVEN the user is in the Settings > Features panel and `shift_management_enabled` is true
- WHEN the user unchecks the "Sistema de turnos" checkbox
- THEN the flag is updated to `false` and the shift UI is hidden

### Requirement: Conditional UI Rendering

All shift management UI elements — header button, checkout alert, shift report modal, and shift history tab — MUST only render when `shift_management_enabled` is `true`. When the flag is `false`, the application MUST behave exactly as before this feature was introduced.

#### Scenario: Flag OFF hides all shift UI

- GIVEN `shift_management_enabled` is false
- WHEN the user navigates any screen
- THEN no shift button, no checkout alert, no shift history tab, and no shift report modal are visible

#### Scenario: Flag ON shows shift UI

- GIVEN `shift_management_enabled` is true
- WHEN the user navigates any screen
- THEN the shift button is visible, checkout is guarded, and shift history is accessible
