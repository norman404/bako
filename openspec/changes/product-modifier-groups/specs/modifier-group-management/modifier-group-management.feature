Feature: Modifier Group Management

  Define the CRUD lifecycle of modifier groups (reusable customization templates)
  and their inner options. A modifier group represents a configurable dimension of
  a product (ice level, sugar level, toppings, free-text comments) with one of four
  selection types and an ordered list of options that may carry a price surcharge.

  @happy-path
  Scenario: Create a single-select group
    Given an admin creating a modifier group named "Nivel de hielo"
    When the group is created with type = "single", required = false
    Then the system persists a row in modifier_groups with the provided values
    And deletedAt is NULL
    And sortOrder is 0

  @error
  Scenario: Reject creation with invalid type
    Given an admin creating a modifier group
    When type is set to "dropdown"
    Then the system rejects the creation with a validation error

  @happy-path
  Scenario: Create a required text group
    Given an admin creating a group named "Comentarios"
    When the group is created with type = "text", required = true
    Then the system persists the group with required = 1

  @happy-path
  Scenario: Update group name and sort order
    Given an existing modifier group "Nivel de hielo" with sortOrder = 0
    When updated with name = "Hielo", sortOrder = 2
    Then the group row reflects the new name and sortOrder
    And updatedAt is refreshed

  @error
  Scenario: Reject update of an archived group
    Given a modifier group with deletedAt set to a non-null value
    When an update is attempted
    Then the system rejects the operation

  @happy-path
  Scenario: Change type from multiple to single with one default
    Given a group of type multiple with one option having is_default = true
    When the type is changed to single
    Then the system accepts the update
    And the existing single default remains valid

  @happy-path
  Scenario: Archive a group with options
    Given a modifier group "Toppings" with 3 active options
    When the group is archived
    Then modifier_groups.deletedAt is set to a non-null timestamp
    And all 3 child rows in modifier_options have deletedAt set to a non-null timestamp

  @happy-path
  Scenario: Archived group excluded from POS listing
    Given two groups "A" (active) and "B" (archived)
    When the POS queries active modifier groups
    Then only group "A" is returned

  @edge-case
  Scenario: Archive an already-archived group is a no-op
    Given a group with deletedAt already set
    When archive is invoked again
    Then the system leaves deletedAt unchanged without raising an error

  @happy-path
  Scenario: Create an option with a surcharge
    Given a modifier group "Toppings" of type multiple
    When an option "Extra queso" is created with priceDelta = 500
    Then the option row is persisted with priceDelta = 500, isDefault = false, sortOrder = 0

  @error
  Scenario: Reject negative price delta
    Given an admin creating an option
    When priceDelta is set to -100
    Then the system rejects the creation with a validation error

  @error
  Scenario: Reject non-integer price delta
    Given an admin creating an option
    When priceDelta is set to 5.5
    Then the system rejects the creation with a validation error

  @error
  Scenario: Reject option on text-only group
    Given a modifier group of type = "text"
    When an option is created within it
    Then the system rejects the creation because text groups have no options

  @happy-path
  Scenario: Single group accepts one default
    Given a single group with no defaults set
    When an option is created with isDefault = true
    Then the system persists it as the only default

  @error
  Scenario: Single group rejects second default on creation
    Given a single group where option "Sin hielo" has isDefault = true
    When a new option "Extra hielo" is created with isDefault = true
    Then the system rejects the creation with a constraint violation

  @happy-path
  Scenario: Multiple group accepts several defaults
    Given a multiple group with one option already isDefault = true
    When a second option is created with isDefault = true
    Then the system persists the second option as default

  @happy-path
  Scenario: Promote option to default demotes previous default on single
    Given a single group where option "Poco" is the current default
    When option "Normal" is updated to isDefault = true
    Then "Poco" is set to isDefault = false
    And "Normal" becomes isDefault = true

  @happy-path
  Scenario: Update option price delta
    Given an option "Extra queso" with priceDelta = 500
    When updated to priceDelta = 600
    Then the row reflects the new value
    And updatedAt is refreshed

  @error
  Scenario: Reject update with negative price delta
    Given an option with priceDelta = 500
    When updated to priceDelta = -10
    Then the system rejects the update

  @error
  Scenario: Reject update of archived option
    Given an option whose deletedAt is set
    When an update is attempted
    Then the system rejects the operation

  @happy-path
  Scenario: Archive a single option
    Given a group "Toppings" with options "A", "B", "C"
    When option "B" is archived
    Then only "A" and "C" appear in the active option listing for that group

  @edge-case
  Scenario: Archive the default option of a single group
    Given a single group whose only default option is "Normal"
    When "Normal" is archived
    Then the group has no default selected
    And subsequent UI interactions treat the group as having no pre-selected option

  @happy-path
  Scenario: Group archive cascades to options
    Given a modifier group "Salsa" with 4 active options
    When the group is archived
    Then every row in modifier_options with group_id referencing "Salsa" has deletedAt set to a non-null value
    And no active options remain for that group