Feature: Cash Movements

  Recording non-sale money movements (income and expense) during an active shift,
  affecting the expected cash count at shift close.

  Scenario: Create income movement on active shift
    Given an active shift exists
    When the user creates an income movement with amount=5000 and reason="Fondo adicional"
    Then the system persists the movement with type="income" and the shift's id

  Scenario: Create expense movement on active shift
    Given an active shift exists
    When the user creates an expense movement with amount=2000 and reason="Compra de bolsas"
    Then the system persists the movement with type="expense" and the shift's id

  Scenario: Reject movement with zero or negative amount
    Given an active shift exists
    When the user attempts to create a movement with amount=0
    Then the system rejects the request with an invalidCashMovement error

  Scenario: Reject movement with empty reason
    Given an active shift exists
    When the user attempts to create a movement with reason shorter than 3 characters
    Then the system rejects the request with an invalidCashMovement error

  Scenario: Reject movement when no active shift
    Given no shift is currently active
    When the user attempts to create a movement
    Then the system rejects the request with a noActiveShift error

  Scenario: Update movement amount
    Given an active shift with an expense movement of amount=2000
    When the user updates the movement amount to 2500
    Then the system persists the new amount and keeps the original type and reason

  Scenario: Update movement reason
    Given an active shift with an income movement of reason="Fondo"
    When the user updates the reason to "Fondo adicional caja"
    Then the system persists the new reason

  Scenario: Reject type change
    Given an active shift with an income movement
    When the user attempts to update the movement type to "expense"
    Then the system rejects the request with an invalidCashMovement error

  Scenario: Reject update on closed shift
    Given a closed shift with a cash movement
    When the user attempts to update that movement
    Then the system rejects the request with a noActiveShift error

  Scenario: Delete movement from active shift
    Given an active shift with a cash movement
    When the user deletes the movement
    Then the system removes the movement permanently

  Scenario: Reject delete on closed shift
    Given a closed shift with a cash movement
    When the user attempts to delete that movement
    Then the system rejects the request with a noActiveShift error

  Scenario: Delete non-existent movement
    Given an active shift
    When the user attempts to delete a movement id that does not exist
    Then the system rejects the request with a cashMovementNotFound error

  Scenario: List movements for active shift
    Given an active shift with 3 movements (2 income, 1 expense)
    When the user requests the movement list
    Then the system returns 3 movements ordered by createdAt ascending

  Scenario: List movements for shift with no movements
    Given a shift with zero movements
    When the user requests the movement list
    Then the system returns an empty list

  Scenario: List movements for closed shift
    Given a closed shift with 2 movements
    When the user requests the movement list
    Then the system returns 2 movements (read-only)