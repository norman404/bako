# TSPL Command Printing Specification

## Purpose

Define how Bako generates and emits TSPL label commands for `"label"` printers when printing kitchen/command labels, without affecting legacy ESC/POS flows.

## Requirements

### Requirement: Protocol Selection

The system MUST generate TSPL commands when the destination printer is type `"label"`.

#### Scenario: Label printer receives TSPL

- GIVEN a configured printer of type `"label"`
- WHEN `print_command` is invoked for that printer
- THEN the backend MUST produce TSPL bytes instead of ESC/POS

### Requirement: TSPL Command Structure

The generated TSPL MUST set label size and gap, clear the image buffer, print header text, print each order item including modifiers, and end with print and end commands.

#### Scenario: Kitchen label with one item

- GIVEN a label printer with dimensions 40 mm × 30 mm × 2 mm gap
- WHEN a kitchen command with a single hamburger and no modifiers is printed
- THEN the TSPL output MUST contain `SIZE 40 mm, 30 mm`, `GAP 2 mm`, `CLS`, a header text command, an item text command, and `PRINT 1` followed by `END`

#### Scenario: Kitchen label with modifiers

- GIVEN a label printer with default dimensions
- WHEN a kitchen command with an item that has modifiers is printed
- THEN the TSPL output MUST contain item text followed by modifier text for that item

### Requirement: Legacy Compatibility

The system MUST NOT change the command format for `"usb"` or `"network"` printers.

#### Scenario: USB receipt printer stays ESC/POS

- GIVEN a configured printer of type `"usb"`
- WHEN `print_command` is invoked for that printer
- THEN the backend MUST continue producing ESC/POS bytes
