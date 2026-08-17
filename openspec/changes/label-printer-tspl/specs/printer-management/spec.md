# Printer Management Specification

## Purpose

Define how printers are registered, typed, and configured, including the new `"label"` type and its dimension settings.

## Requirements

### Requirement: Supported Printer Types

`PrinterType` MUST support `"usb"`, `"network"`, and `"label"`.

#### Scenario: List available printer types

- GIVEN the printer administration panel
- WHEN the user opens the printer type selector
- THEN the options MUST include `"usb"`, `"network"`, and `"label"`

### Requirement: Label Printer Dimensions

When type `"label"` is selected, the system MUST expose and persist width, height, and gap fields in millimeters.

#### Scenario: Show dimension fields for label printers

- GIVEN a printer form with type `"label"` selected
- WHEN the form is rendered
- THEN width, height, and gap input fields MUST be visible

#### Scenario: Hide dimension fields for non-label printers

- GIVEN a printer form with type `"usb"` selected
- WHEN the form is rendered
- THEN width, height, and gap input fields MUST NOT be visible

### Requirement: Type Validation

The system MUST reject any printer type outside the supported set.

#### Scenario: Reject unsupported type

- GIVEN a printer payload with type `"serial"`
- WHEN the record is validated
- THEN the system MUST return a validation error
