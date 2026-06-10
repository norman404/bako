Feature: Shift Core

  Define the lifecycle of a work shift: opening, active tracking, closing,
  and associating orders to the active shift.

  @happy-path
  Scenario: Open first shift of the day
    Given no shift is currently active
    When the user opens a new shift
    Then the system creates an active shift with the current timestamp as openedAt

  @error
  Scenario: Reject opening when shift already active
    Given a shift is currently active
    When the user attempts to open another shift
    Then the system rejects the request and returns a ShiftAlreadyActiveError

  @happy-path
  Scenario: Close active shift with sales
    Given an active shift exists with one or more associated orders
    When the user closes the shift
    Then the shift status becomes closed and closedAt is persisted

  @edge-case
  Scenario: Close active shift without sales
    Given an active shift exists with zero associated orders
    When the user closes the shift
    Then the shift status becomes closed and closedAt is persisted

  @error
  Scenario: Reject closing when no active shift
    Given no shift is currently active
    When the user attempts to close a shift
    Then the system rejects the request and returns a NoActiveShiftError

  @happy-path
  Scenario: Retrieve active shift
    Given an active shift exists
    When the system queries for the active shift
    Then the active shift is returned

  @edge-case
  Scenario: No active shift exists
    Given no shift is currently active
    When the system queries for the active shift
    Then the system indicates no active shift exists

  @happy-path
  Scenario: Create order with active shift and flag ON
    Given the shift_management_enabled flag is true and an active shift exists
    When a new order is created
    Then the order is persisted with shiftId set to the active shift's id

  @error
  Scenario: Reject order creation without active shift and flag ON
    Given the shift_management_enabled flag is true and no active shift exists
    When a user attempts to create an order
    Then the system rejects the order and returns a NoActiveShiftError

  @happy-path
  Scenario: Create order with flag OFF
    Given the shift_management_enabled flag is false
    When a new order is created
    Then the order is persisted with shiftId set to NULL

  @happy-path
  Scenario: List shift history with closed and active shifts
    Given there are 3 closed shifts and 1 active shift
    When the user requests the shift history
    Then the list returns 4 entries sorted by openedAt descending, with correct status and totals

  @edge-case
  Scenario: Empty shift history
    Given no shifts have ever been created
    When the user requests the shift history
    Then the system returns an empty list
