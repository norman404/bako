Feature: Printer Management

  Printers are registered with a type and, for label printers, configurable
  dimensions. Legacy types keep their existing behavior.

  @happy-path
  Scenario: List available printer types
    Given the printer administration panel
    When the user opens the printer type selector
    Then the options must include "usb", "network", and "label"

  @happy-path
  Scenario: Show dimension fields for label printers
    Given a printer form with type "label" selected
    When the form is rendered
    Then width, height, and gap input fields must be visible

  @edge-case
  Scenario: Hide dimension fields for non-label printers
    Given a printer form with type "usb" selected
    When the form is rendered
    Then width, height, and gap input fields must not be visible

  @error
  Scenario: Reject unsupported type
    Given a printer payload with type "serial"
    When the record is validated
    Then the system must return a validation error
