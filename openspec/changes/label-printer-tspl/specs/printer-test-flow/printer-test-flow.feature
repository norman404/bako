Feature: Printer Test Flow

  The test-page button emits the correct command language for the printer's
  type: TSPL for label printers and ESC/POS for legacy printers.

  @happy-path
  Scenario: Test a label printer
    Given a configured printer of type "label"
    When the user presses the test button
    Then the system must emit a valid TSPL test-page payload
    And the payload must contain "SIZE"
    And the payload must contain "GAP"
    And the payload must contain "CLS"
    And the payload must contain sample text
    And the payload must contain "PRINT 1"
    And the payload must contain "END"

  @regression
  Scenario: Test a USB printer
    Given a configured printer of type "usb"
    When the user presses the test button
    Then the system must emit an ESC/POS test-page payload

  @regression
  Scenario: Test a network printer
    Given a configured printer of type "network"
    When the user presses the test button
    Then the system must emit an ESC/POS test-page payload
