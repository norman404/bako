# Cash Movements Specification

## Purpose

Define how the system records non-sale money movements (income and expense) during an active shift, affecting the expected cash count at shift close.

## Requirements

### Requirement: Create Cash Movement

The system MUST allow recording a cash movement on the active shift. Each movement MUST have a type (`income` or `expense`), an amount in cents (`> 0`), and a reason (`>= 3` characters). Movements MUST only be created while a shift is active.

#### Scenario: Create income movement on active shift

- GIVEN an active shift exists
- WHEN the user creates an income movement with amount=5000 and reason="Fondo adicional"
- THEN the system persists the movement with type="income" and the shift's id

#### Scenario: Create expense movement on active shift

- GIVEN an active shift exists
- WHEN the user creates an expense movement with amount=2000 and reason="Compra de bolsas"
- THEN the system persists the movement with type="expense" and the shift's id

#### Scenario: Reject movement with zero or negative amount

- GIVEN an active shift exists
- WHEN the user attempts to create a movement with amount=0
- THEN the system rejects the request with an invalidCashMovement error

#### Scenario: Reject movement with empty reason

- GIVEN an active shift exists
- WHEN the user attempts to create a movement with reason shorter than 3 characters
- THEN the system rejects the request with an invalidCashMovement error

#### Scenario: Reject movement when no active shift

- GIVEN no shift is currently active
- WHEN the user attempts to create a movement
- THEN the system rejects the request with a noActiveShift error

### Requirement: Update Cash Movement

The system MUST allow updating the amount and/or reason of an existing cash movement. The type of a movement MUST NOT be changeable after creation. Updates MUST only be permitted while the parent shift is active.

#### Scenario: Update movement amount

- GIVEN an active shift with an expense movement of amount=2000
- WHEN the user updates the movement amount to 2500
- THEN the system persists the new amount and keeps the original type and reason

#### Scenario: Update movement reason

- GIVEN an active shift with an income movement of reason="Fondo"
- WHEN the user updates the reason to "Fondo adicional caja"
- THEN the system persists the new reason

#### Scenario: Reject type change

- GIVEN an active shift with an income movement
- WHEN the user attempts to update the movement type to "expense"
- THEN the system rejects the request with an invalidCashMovement error

#### Scenario: Reject update on closed shift

- GIVEN a closed shift with a cash movement
- WHEN the user attempts to update that movement
- THEN the system rejects the request with a noActiveShift error

### Requirement: Delete Cash Movement

The system MUST allow deleting a cash movement. Deletion MUST only be permitted while the parent shift is active.

#### Scenario: Delete movement from active shift

- GIVEN an active shift with a cash movement
- WHEN the user deletes the movement
- THEN the system removes the movement permanently

#### Scenario: Reject delete on closed shift

- GIVEN a closed shift with a cash movement
- WHEN the user attempts to delete that movement
- THEN the system rejects the request with a noActiveShift error

#### Scenario: Delete non-existent movement

- GIVEN an active shift
- WHEN the user attempts to delete a movement id that does not exist
- THEN the system rejects the request with a cashMovementNotFound error

### Requirement: List Cash Movements

The system MUST list all cash movements for a given shift, ordered by `createdAt` ascending. The list MUST be available for both active and closed shifts (read-only for closed).

#### Scenario: List movements for active shift

- GIVEN an active shift with 3 movements (2 income, 1 expense)
- WHEN the user requests the movement list
- THEN the system returns 3 movements ordered by createdAt ascending

#### Scenario: List movements for shift with no movements

- GIVEN a shift with zero movements
- WHEN the user requests the movement list
- THEN the system returns an empty list

#### Scenario: List movements for closed shift

- GIVEN a closed shift with 2 movements
- WHEN the user requests the movement list
- THEN the system returns 2 movements (read-only)