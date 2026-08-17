Feature: Printer Label Type

  The "label" printer type is available together with configurable label
  dimensions, while legacy types remain unchanged.

  @happy-path
  Scenario: Register a label printer
    Given the printer creation form
    When the user selects type "label"
    Then the system must allow saving a printer of type "label"

  @happy-path
  Scenario: Default dimensions for a new label printer
    Given a newly created printer of type "label"
    When the printer record is persisted
    Then width must default to 40 mm
    And height must default to 30 mm
    And gap must default to 2 mm

  @happy-path
  Scenario: Custom dimensions are persisted
    Given a label printer with custom width 50 mm, height 25 mm, and gap 3 mm
    When the printer is updated
    Then the persisted record must store those exact values

  @error
  Scenario: Invalid printer type rejected
    Given a printer payload with type "bluetooth"
    When the payload is validated
    Then the system must reject it with a validation error
