# Print Command Routing Specification

## Purpose

Define how the `print_command` invocation selects the correct print protocol based on the destination printer type.

## Requirements

### Requirement: Type-Based Routing

When `print_command` is invoked, the system MUST choose the protocol based on the target printer type.

#### Scenario: Route label printers to TSPL

- GIVEN a target printer of type `"label"`
- WHEN `print_command` is called
- THEN the system MUST generate a TSPL label for the order

#### Scenario: Route USB printers to ESC/POS

- GIVEN a target printer of type `"usb"`
- WHEN `print_command` is called
- THEN the system MUST generate ESC/POS bytes

#### Scenario: Route network printers to ESC/POS

- GIVEN a target printer of type `"network"`
- WHEN `print_command` is called
- THEN the system MUST generate ESC/POS bytes

### Requirement: Legacy Receipt Flow Isolation

The legacy receipt flow, including `print_ticket`, MUST remain unchanged and independent of label routing.

#### Scenario: Ticket printing unaffected by label support

- GIVEN a receipt printer of type `"usb"`
- WHEN `print_ticket` is invoked
- THEN the system MUST generate ESC/POS ticket bytes exactly as before label support existed
