Feature: Feature Flag Integration

  Define how the shift_management_enabled feature flag is declared, exposed
  in settings, and used to conditionally render shift management UI.

  @happy-path
  Scenario: Fresh app install
    Given the app is launched for the first time
    When the feature flags initialize
    Then shift_management_enabled is present in the flags map with value false

  @happy-path
  Scenario: Flag persists across sessions
    Given the user previously enabled shift_management_enabled
    When the app restarts
    Then the flag retains the previously set value

  @happy-path
  Scenario: Enable shift management from settings
    Given the user is in the Settings > Features panel and shift_management_enabled is false
    When the user checks the "Sistema de turnos" checkbox
    Then the flag is updated to true and the UI immediately reflects the change

  @happy-path
  Scenario: Disable shift management from settings
    Given the user is in the Settings > Features panel and shift_management_enabled is true
    When the user unchecks the "Sistema de turnos" checkbox
    Then the flag is updated to false and the shift UI is hidden

  @happy-path
  Scenario: Flag OFF hides all shift UI
    Given shift_management_enabled is false
    When the user navigates any screen
    Then no shift button, no checkout alert, no shift history tab, and no shift report modal are visible

  @happy-path
  Scenario: Flag ON shows shift UI
    Given shift_management_enabled is true
    When the user navigates any screen
    Then the shift button is visible, checkout is guarded, and shift history is accessible
