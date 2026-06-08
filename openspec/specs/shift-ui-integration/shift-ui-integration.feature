Feature: Shift UI Integration

  Define how shift management controls and indicators are integrated into
  the main application UI, including the header button, checkout blocking,
  and modals.

  @happy-path
  Scenario: Show open shift button when flag is ON and no active shift
    Given the shift_management_enabled flag is true and no shift is active
    When the user views the main UI header
    Then the header displays an "Open Shift" button

  @happy-path
  Scenario: Show close shift button when flag is ON and shift is active
    Given the shift_management_enabled flag is true and a shift is active
    When the user views the main UI header
    Then the header displays a "Close Shift" button

  @happy-path
  Scenario: Hide shift button when flag is OFF
    Given the shift_management_enabled flag is false
    When the user views the main UI header
    Then no shift button is visible

  @error
  Scenario: Block checkout when no active shift
    Given the cart contains items, the shift_management_enabled flag is true, and no shift is active
    When the user attempts to open the checkout modal
    Then the system prevents the checkout modal from opening and shows an alert: "Debes abrir un turno antes de vender"

  @happy-path
  Scenario: Allow checkout with active shift
    Given the cart contains items, the shift_management_enabled flag is true, and a shift is active
    When the user attempts to open the checkout modal
    Then the checkout modal opens normally

  @happy-path
  Scenario: Allow checkout when flag is OFF regardless of shift
    Given the cart contains items and the shift_management_enabled flag is false
    When the user attempts to open the checkout modal
    Then the checkout modal opens normally, regardless of shift state

  @happy-path
  Scenario: Display report modal after closing shift
    Given an active shift exists with associated orders and the shift_management_enabled flag is true
    When the user clicks the "Close Shift" button
    Then the shift closes and a modal opens displaying the complete shift report

  @happy-path
  Scenario: Close report modal
    Given the shift report modal is open
    When the user clicks the close button or the overlay
    Then the modal closes and the user returns to the main UI

  @happy-path
  Scenario: Access shift history from settings
    Given the shift_management_enabled flag is true and there are closed shifts
    When the user opens Settings and selects the "Shift History" tab
    Then a list of past shifts is displayed with date, total, and order count

  @happy-path
  Scenario: Shift history tab hidden when flag is OFF
    Given the shift_management_enabled flag is false
    When the user opens Settings
    Then the "Shift History" tab is not visible

  @happy-path
  Scenario: Open individual report from history
    Given the shift history list is visible
    When the user selects a specific shift from the list
    Then a modal opens showing the full report for that shift
