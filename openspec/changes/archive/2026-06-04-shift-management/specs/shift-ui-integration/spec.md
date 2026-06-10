# Shift UI Integration Specification

## Purpose
Define how shift management controls and indicators are integrated into the main application UI, including the header button, checkout blocking, and modals.

## Requirements

### Requirement: Shift Button in Header

The system MUST display a shift button in the `App.tsx` header, positioned alongside the Settings and Cart buttons. The button MUST only appear when the `shift_management_enabled` feature flag is true. The button MUST toggle between "Open Shift" and "Close Shift" states based on whether an active shift exists.

#### Scenario: Show open shift button when flag is ON and no active shift

- GIVEN the `shift_management_enabled` flag is true and no shift is active
- WHEN the user views the main UI header
- THEN the header displays an "Open Shift" button

#### Scenario: Show close shift button when flag is ON and shift is active

- GIVEN the `shift_management_enabled` flag is true and a shift is active
- WHEN the user views the main UI header
- THEN the header displays a "Close Shift" button

#### Scenario: Hide shift button when flag is OFF

- GIVEN the `shift_management_enabled` flag is false
- WHEN the user views the main UI header
- THEN no shift button is visible

### Requirement: Checkout Block Without Active Shift

When the `shift_management_enabled` flag is true and no shift is active, the system MUST block the checkout flow and display an alert informing the user that a shift must be opened first.

#### Scenario: Block checkout when no active shift

- GIVEN the cart contains items, the `shift_management_enabled` flag is true, and no shift is active
- WHEN the user attempts to open the checkout modal
- THEN the system prevents the checkout modal from opening and shows an alert: "Debes abrir un turno antes de vender"

#### Scenario: Allow checkout with active shift

- GIVEN the cart contains items, the `shift_management_enabled` flag is true, and a shift is active
- WHEN the user attempts to open the checkout modal
- THEN the checkout modal opens normally

#### Scenario: Allow checkout when flag is OFF regardless of shift

- GIVEN the cart contains items and the `shift_management_enabled` flag is false
- WHEN the user attempts to open the checkout modal
- THEN the checkout modal opens normally, regardless of shift state

### Requirement: Shift Report Modal on Close

When the user closes an active shift, the system MUST immediately display a modal with the shift report. The modal MUST show: openedAt, closedAt, total orders, total sales, cash total, and card total.

#### Scenario: Display report modal after closing shift

- GIVEN an active shift exists with associated orders and the `shift_management_enabled` flag is true
- WHEN the user clicks the "Close Shift" button
- THEN the shift closes and a modal opens displaying the complete shift report

#### Scenario: Close report modal

- GIVEN the shift report modal is open
- WHEN the user clicks the close button or the overlay
- THEN the modal closes and the user returns to the main UI

### Requirement: Shift History in Settings

The system MUST provide a "Shift History" tab inside the Settings modal, registered via the module manifest. The tab MUST only appear when the `shift_management_enabled` flag is true. The tab MUST list all past shifts with date, total sales, and order count, and allow opening individual reports.

#### Scenario: Access shift history from settings

- GIVEN the `shift_management_enabled` flag is true and there are closed shifts
- WHEN the user opens Settings and selects the "Shift History" tab
- THEN a list of past shifts is displayed with date, total, and order count

#### Scenario: Shift history tab hidden when flag is OFF

- GIVEN the `shift_management_enabled` flag is false
- WHEN the user opens Settings
- THEN the "Shift History" tab is not visible

#### Scenario: Open individual report from history

- GIVEN the shift history list is visible
- WHEN the user selects a specific shift from the list
- THEN a modal opens showing the full report for that shift
