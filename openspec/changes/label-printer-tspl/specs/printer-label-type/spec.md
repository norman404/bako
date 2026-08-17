# Printer Label Type Specification

## Purpose

Define the `"label"` printer type and its configurable label dimensions.

## Requirements

### Requirement: New Printer Type

`PrinterType` MUST accept `"label"` in addition to `"usb"` and `"network"`.

#### Scenario: Register a label printer

- GIVEN the printer creation form
- WHEN the user selects type `"label"`
- THEN the system MUST allow saving a printer of type `"label"`

### Requirement: Label Dimensions

A label printer MUST have configurable label dimensions: width in mm, height in mm, and gap in mm. Defaults MUST be 40 mm, 30 mm, and 2 mm respectively.

#### Scenario: Default dimensions for a new label printer

- GIVEN a newly created printer of type `"label"`
- WHEN the printer record is persisted
- THEN width MUST default to 40 mm, height to 30 mm, and gap to 2 mm

#### Scenario: Custom dimensions are persisted

- GIVEN a label printer with custom width 50 mm, height 25 mm, and gap 3 mm
- WHEN the printer is updated
- THEN the persisted record MUST store those exact values

### Requirement: Type Validation

The system MUST reject any printer type other than `"usb"`, `"network"`, or `"label"`.

#### Scenario: Invalid printer type rejected

- GIVEN a printer payload with type `"bluetooth"`
- WHEN the payload is validated
- THEN the system MUST reject it with a validation error
