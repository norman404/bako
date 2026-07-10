# Modifier Group Management Specification

## Purpose

Define the CRUD lifecycle of modifier groups (reusable customization templates) and their inner options. A modifier group represents a configurable dimension of a product (ice level, sugar level, toppings, free-text comments) with one of four selection types and an ordered list of options that may carry a price surcharge.

## Requirements

### Requirement: Modifier Group Creation

The system MUST allow creating a modifier group with `id`, `name`, `type`, `required`, `sortOrder`, and audit timestamps. The `type` field MUST be one of `'single'`, `'multiple'`, `'text'`, `'single_text'`. The `required` flag MUST default to `false` and `sortOrder` MUST default to `0`. A newly created group MUST have `deletedAt = NULL`.

#### Scenario: Create a single-select group

- GIVEN an admin creating a modifier group named "Nivel de hielo"
- WHEN the group is created with `type = "single"`, `required = false`
- THEN the system persists a row in `modifier_groups` with the provided values
- AND `deletedAt` is NULL
- AND `sortOrder` is 0

#### Scenario: Reject creation with invalid type

- GIVEN an admin creating a modifier group
- WHEN `type` is set to `"dropdown"`
- THEN the system MUST reject the creation with a validation error

#### Scenario: Create a required text group

- GIVEN an admin creating a group named "Comentarios"
- WHEN the group is created with `type = "text"`, `required = true`
- THEN the system persists the group with `required = 1`

---

### Requirement: Modifier Group Update

The system MUST allow updating the `name`, `type`, `required`, and `sortOrder` of a non-archived modifier group. Updating `type` MUST NOT alter existing options unless the new type imposes new validation constraints.

#### Scenario: Update group name and sort order

- GIVEN an existing modifier group "Nivel de hielo" with `sortOrder = 0`
- WHEN updated with `name = "Hielo"`, `sortOrder = 2`
- THEN the group row reflects the new `name` and `sortOrder`
- AND `updatedAt` is refreshed

#### Scenario: Reject update of an archived group

- GIVEN a modifier group with `deletedAt` set to a non-null value
- WHEN an update is attempted
- THEN the system MUST reject the operation

#### Scenario: Change type from multiple to single with one default

- GIVEN a group of type `multiple` with one option having `is_default = true`
- WHEN the type is changed to `single`
- THEN the system accepts the update
- AND the existing single default remains valid

---

### Requirement: Modifier Group Archive

The system MUST support soft-deleting a modifier group by setting `deletedAt` to the current timestamp. Archived groups MUST NOT appear in listings consumed by the POS UI. Archiving a group MUST cascade-archive all its options.

#### Scenario: Archive a group with options

- GIVEN a modifier group "Toppings" with 3 active options
- WHEN the group is archived
- THEN `modifier_groups.deletedAt` is set to a non-null timestamp
- AND all 3 child rows in `modifier_options` have `deletedAt` set to a non-null timestamp

#### Scenario: Archived group excluded from POS listing

- GIVEN two groups "A" (active) and "B" (archived)
- WHEN the POS queries active modifier groups
- THEN only group "A" is returned

#### Scenario: Archive an already-archived group is a no-op

- GIVEN a group with `deletedAt` already set
- WHEN archive is invoked again
- THEN the system SHOULD leave `deletedAt` unchanged (no error)

---

### Requirement: Option Creation Within a Group

The system MUST allow creating options within a modifier group with `id`, `groupId`, `name`, `priceDelta`, `isDefault`, `sortOrder`, and audit timestamps. The `priceDelta` MUST be a non-negative integer expressed in cents and MUST default to `0`. The `isDefault` flag MUST default to `false`.

#### Scenario: Create an option with a surcharge

- GIVEN a modifier group "Toppings" of type `multiple`
- WHEN an option "Extra queso" is created with `priceDelta = 500`
- THEN the option row is persisted with `priceDelta = 500`, `isDefault = false`, `sortOrder = 0`

#### Scenario: Reject negative price delta

- GIVEN an admin creating an option
- WHEN `priceDelta` is set to `-100`
- THEN the system MUST reject the creation with a validation error

#### Scenario: Reject non-integer price delta

- GIVEN an admin creating an option
- WHEN `priceDelta` is set to `5.5`
- THEN the system MUST reject the creation with a validation error

#### Scenario: Reject option on text-only group

- GIVEN a modifier group of `type = "text"`
- WHEN an option is created within it
- THEN the system MUST reject the creation because text groups have no options

---

### Requirement: Default Option Constraint for Single Groups

For modifier groups of `type = "single"` or `type = "single_text"`, AT MOST ONE option MAY have `isDefault = true` at any given time. For groups of `type = "multiple"`, multiple options MAY have `isDefault = true`. For groups of `type = "text"`, the `isDefault` flag on options is meaningless because no options exist.

#### Scenario: Single group accepts one default

- GIVEN a `single` group with no defaults set
- WHEN an option is created with `isDefault = true`
- THEN the system persists it as the only default

#### Scenario: Single group rejects second default on creation

- GIVEN a `single` group where option "Sin hielo" has `isDefault = true`
- WHEN a new option "Extra hielo" is created with `isDefault = true`
- THEN the system MUST reject the creation with a constraint violation

#### Scenario: Multiple group accepts several defaults

- GIVEN a `multiple` group with one option already `isDefault = true`
- WHEN a second option is created with `isDefault = true`
- THEN the system persists the second option as default

#### Scenario: Promote option to default demotes previous default on single

- GIVEN a `single` group where option "Poco" is the current default
- WHEN option "Normal" is updated to `isDefault = true`
- THEN "Poco" is set to `isDefault = false`
- AND "Normal" becomes `isDefault = true`

---

### Requirement: Option Update

The system MUST allow updating the `name`, `priceDelta`, `isDefault`, and `sortOrder` of a non-archived option. Updates to `isDefault` MUST respect the single-default constraint for `single` and `single_text` groups.

#### Scenario: Update option price delta

- GIVEN an option "Extra queso" with `priceDelta = 500`
- WHEN updated to `priceDelta = 600`
- THEN the row reflects the new value
- AND `updatedAt` is refreshed

#### Scenario: Reject update with negative price delta

- GIVEN an option with `priceDelta = 500`
- WHEN updated to `priceDelta = -10`
- THEN the system MUST reject the update

#### Scenario: Reject update of archived option

- GIVEN an option whose `deletedAt` is set
- WHEN an update is attempted
- THEN the system MUST reject the operation

---

### Requirement: Option Archive

The system MUST support soft-deleting an option by setting `deletedAt`. Archived options MUST NOT appear in listings consumed by the POS UI.

#### Scenario: Archive a single option

- GIVEN a group "Toppings" with options "A", "B", "C"
- WHEN option "B" is archived
- THEN only "A" and "C" appear in the active option listing for that group

#### Scenario: Archive the default option of a single group

- GIVEN a `single` group whose only default option is "Normal"
- WHEN "Normal" is archived
- THEN the group has no default selected
- AND subsequent UI interactions treat the group as having no pre-selected option

---

### Requirement: Cascade Archive on Group Archive

Archiving a modifier group MUST cascade to all its child options, marking each with `deletedAt` equal to or greater than the group's `deletedAt`.

#### Scenario: Group archive cascades to options

- GIVEN a modifier group "Salsa" with 4 active options
- WHEN the group is archived
- THEN every row in `modifier_options` with `group_id` referencing "Salsa" has `deletedAt` set to a non-null value
- AND no active options remain for that group