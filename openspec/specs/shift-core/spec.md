# Shift Core Specification

## Purpose
Define the lifecycle of a work shift: opening, active tracking, closing, and associating orders to the active shift.

## Requirements

### Requirement: Open Shift

The system MUST allow opening a new shift when no shift is currently active. The system MUST require an `openingCash` amount in cents greater than zero at the time of opening. A shift is considered active from the moment it is opened until it is explicitly closed. Only one shift MAY be active at any time.

#### Scenario: Open first shift of the day with opening cash

- GIVEN no shift is currently active
- WHEN the user opens a new shift with openingCash=10000
- THEN the system creates an active shift with the current timestamp as openedAt and openingCash=10000

#### Scenario: Reject opening with zero or negative opening cash

- GIVEN no shift is currently active
- WHEN the user attempts to open a shift with openingCash=0
- THEN the system rejects the request and returns an invalidOpeningCash error

#### Scenario: Reject opening when shift already active

- GIVEN a shift is currently active
- WHEN the user attempts to open another shift
- THEN the system rejects the request and returns a ShiftAlreadyActiveError

#### Scenario: Legacy shift without opening cash

- GIVEN a shift was created before the cash management migration
- WHEN the system reads that shift
- THEN the system returns openingCash=0 for backward compatibility

### Requirement: Close Shift

The system MUST allow closing the currently active shift. Closing MUST require a `countedCash` amount in cents greater than or equal to zero. Closing MUST persist the current timestamp as `closedAt`, transition the shift status to `closed`, and persist `countedCash` and `cashDifference`. Closing a shift without any associated orders MUST be permitted.

#### Scenario: Close active shift with sales and cash count

- GIVEN an active shift exists with one or more associated orders
- WHEN the user closes the shift with countedCash=20000
- THEN the shift status becomes closed, closedAt is persisted, countedCash=20000 and cashDifference are persisted

#### Scenario: Close active shift without sales

- GIVEN an active shift exists with zero associated orders
- WHEN the user closes the shift with countedCash=5000
- THEN the shift status becomes closed and closedAt is persisted with countedCash=5000

#### Scenario: Reject closing with negative counted cash

- GIVEN an active shift exists
- WHEN the user attempts to close the shift with countedCash=-1
- THEN the system rejects the request and returns an invalidCountedCash error

#### Scenario: Reject closing when no active shift

- GIVEN no shift is currently active
- WHEN the user attempts to close a shift
- THEN the system rejects the request and returns a NoActiveShiftError

### Requirement: Get Active Shift

The system MUST provide the currently active shift, or indicate that none exists. Orders created while a shift is active MUST automatically associate their shiftId to the active shift's id.

#### Scenario: Retrieve active shift

- GIVEN an active shift exists
- WHEN the system queries for the active shift
- THEN the active shift is returned

#### Scenario: No active shift exists

- GIVEN no shift is currently active
- WHEN the system queries for the active shift
- THEN the system indicates no active shift exists

### Requirement: Order Association to Shift

When the shift management feature flag is enabled, the system MUST associate every newly created order with the active shift by setting the order's shiftId. If no active shift exists and the flag is enabled, the system MUST reject order creation.

#### Scenario: Create order with active shift and flag ON

- GIVEN the shift_management_enabled flag is true and an active shift exists
- WHEN a new order is created
- THEN the order is persisted with shiftId set to the active shift's id

#### Scenario: Reject order creation without active shift and flag ON

- GIVEN the shift_management_enabled flag is true and no active shift exists
- WHEN a user attempts to create an order
- THEN the system rejects the order and returns a NoActiveShiftError

#### Scenario: Create order with flag OFF

- GIVEN the shift_management_enabled flag is false
- WHEN a new order is created
- THEN the order is persisted with shiftId set to NULL

### Requirement: Shift History

The system MUST support listing all shifts ordered by openedAt descending. Each entry MUST include the shift id, openedAt, closedAt (if closed), total sales, and number of associated orders.

#### Scenario: List shift history with closed and active shifts

- GIVEN there are 3 closed shifts and 1 active shift
- WHEN the user requests the shift history
- THEN the list returns 4 entries sorted by openedAt descending, with correct status and totals

#### Scenario: Empty shift history

- GIVEN no shifts have ever been created
- WHEN the user requests the shift history
- THEN the system returns an empty list

### Requirement: Cash Reconciliation on Close

The system MUST calculate the expected cash amount when closing a shift using: `expectedCash = openingCash + cashSalesTotal + cashMovementsIncome - cashMovementsExpense`. The system MUST compute `cashDifference = countedCash - expectedCash` and persist both `countedCash` and `cashDifference` on the shift at close time.

#### Scenario: Close shift with exact cash count

- GIVEN an active shift with openingCash=10000, cashSalesTotal=5000, income=2000, expense=1000
- WHEN the user closes the shift with countedCash=16000
- THEN the system persists countedCash=16000 and cashDifference=0

#### Scenario: Close shift with cash surplus

- GIVEN an active shift with openingCash=10000, cashSalesTotal=5000, income=0, expense=0
- WHEN the user closes the shift with countedCash=15500
- THEN the system persists countedCash=15500 and cashDifference=500

#### Scenario: Close shift with cash shortage

- GIVEN an active shift with openingCash=10000, cashSalesTotal=5000, income=0, expense=0
- WHEN the user closes the shift with countedCash=14000
- THEN the system persists countedCash=14000 and cashDifference=-1000