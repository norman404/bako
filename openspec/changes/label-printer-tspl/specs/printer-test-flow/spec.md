# Printer Test Flow Specification

## Purpose

Define the test-page flow so each printer type receives the correct command language when the user clicks the test button.

## Requirements

### Requirement: Test Button Sends TSPL for Label Printers

The test button for a label printer MUST send a TSPL test page.

#### Scenario: Test a label printer

- GIVEN a configured printer of type `"label"`
- WHEN the user presses the test button
- THEN the system MUST emit a valid TSPL test-page payload containing `SIZE`, `GAP`, `CLS`, sample text, `PRINT 1`, and `END`

### Requirement: Test Button Keeps ESC/POS for Legacy Printers

The test button for `"usb"` or `"network"` printers MUST continue sending an ESC/POS test page.

#### Scenario: Test a USB printer

- GIVEN a configured printer of type `"usb"`
- WHEN the user presses the test button
- THEN the system MUST emit an ESC/POS test-page payload

#### Scenario: Test a network printer

- GIVEN a configured printer of type `"network"`
- WHEN the user presses the test button
- THEN the system MUST emit an ESC/POS test-page payload
