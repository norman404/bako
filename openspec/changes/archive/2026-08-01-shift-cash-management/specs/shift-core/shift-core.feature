Feature: Shift Core

  Lifecycle of a work shift: opening with cash, active tracking, closing with
  cash reconciliation, and associating orders to the active shift.

  Scenario: Open first shift of the day with opening cash
    Given no shift is currently active
    When the user opens a new shift with openingCash=10000
    Then the system creates an active shift with the current timestamp as openedAt and openingCash=10000

  Scenario: Reject opening with zero or negative opening cash
    Given no shift is currently active
    When the user attempts to open a shift with openingCash=0
    Then the system rejects the request and returns an invalidOpeningCash error

  Scenario: Reject opening when shift already active
    Given a shift is currently active
    When the user attempts to open another shift
    Then the system rejects the request and returns a ShiftAlreadyActiveError

  Scenario: Legacy shift without opening cash
    Given a shift was created before the cash management migration
    When the system reads that shift
    Then the system returns openingCash=0 for backward compatibility

  Scenario: Close active shift with sales and cash count
    Given an active shift exists with one or more associated orders
    When the user closes the shift with countedCash=20000
    Then the shift status becomes closed, closedAt is persisted, countedCash=20000 and cashDifference are persisted

  Scenario: Close active shift without sales
    Given an active shift exists with zero associated orders
    When the user closes the shift with countedCash=5000
    Then the shift status becomes closed and closedAt is persisted with countedCash=5000

  Scenario: Reject closing with negative counted cash
    Given an active shift exists
    When the user attempts to close the shift with countedCash=-1
    Then the system rejects the request and returns an invalidCountedCash error

  Scenario: Reject closing when no active shift
    Given no shift is currently active
    When the user attempts to close a shift
    Then the system rejects the request and returns a NoActiveShiftError

  Scenario: Close shift with exact cash count
    Given an active shift with openingCash=10000, cashSalesTotal=5000, income=2000, expense=1000
    When the user closes the shift with countedCash=16000
    Then the system persists countedCash=16000 and cashDifference=0

  Scenario: Close shift with cash surplus
    Given an active shift with openingCash=10000, cashSalesTotal=5000, income=0, expense=0
    When the user closes the shift with countedCash=15500
    Then the system persists countedCash=15500 and cashDifference=500

  Scenario: Close shift with cash shortage
    Given an active shift with openingCash=10000, cashSalesTotal=5000, income=0, expense=0
    When the user closes the shift with countedCash=14000
    Then the system persists countedCash=14000 and cashDifference=-1000