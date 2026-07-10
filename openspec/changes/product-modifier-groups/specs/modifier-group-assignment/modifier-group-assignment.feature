Feature: Modifier Group Assignment

  Define how reusable modifier groups are assigned to categories and/or products as
  independent templates, how assignments are removed, and how the effective set of
  modifier groups for a product is resolved by merging category-level and product-level
  assignments with deduplication.

  @happy-path
  Scenario: Assign a group to a category
    Given a category "Bebidas" with id "c1" and a modifier group "Nivel de hielo" with id "g1"
    When the group is assigned to the category
    Then a row (category_id: "c1", group_id: "g1") exists in category_modifier_groups

  @error
  Scenario: Prevent duplicate category assignment
    Given group "g1" already assigned to category "c1"
    When the same assignment is attempted again
    Then the system rejects with a unique constraint violation

  @happy-path
  Scenario: Cascade delete on category removal
    Given category "c1" with groups "g1", "g2" assigned
    When category "c1" is deleted
    Then all rows in category_modifier_groups where category_id = "c1" are deleted
    And groups "g1", "g2" remain in modifier_groups

  @happy-path
  Scenario: Archive modifier group removes category assignments
    Given group "g1" assigned to categories "c1", "c2"
    When group "g1" is archived
    Then all rows in category_modifier_groups where group_id = "g1" are removed

  @happy-path
  Scenario: Assign a group to a product
    Given a product "Capuchino" with id "p1" and a modifier group "Leche alternativa" with id "g3"
    When the group is assigned to the product
    Then a row (product_id: "p1", group_id: "g3") exists in product_modifier_groups

  @error
  Scenario: Prevent duplicate product assignment
    Given group "g3" already assigned to product "p1"
    When the same assignment is attempted again
    Then the system rejects with a unique constraint violation

  @happy-path
  Scenario: Cascade delete on product removal
    Given product "p1" with groups "g3", "g4" assigned
    When product "p1" is deleted
    Then all rows in product_modifier_groups where product_id = "p1" are deleted
    And groups "g3", "g4" remain in modifier_groups

  @happy-path
  Scenario: Archive modifier group removes product assignments
    Given group "g3" assigned to products "p1", "p2"
    When group "g3" is archived
    Then all rows in product_modifier_groups where group_id = "g3" are removed

  @happy-path
  Scenario: Unassign group from category
    Given group "g1" assigned to category "c1"
    When the assignment is removed
    Then the row (c1, g1) no longer exists in category_modifier_groups
    And group "g1" remains active in modifier_groups

  @happy-path
  Scenario: Unassign group from product
    Given group "g3" assigned to product "p1"
    When the assignment is removed
    Then the row (p1, g3) no longer exists in product_modifier_groups
    And group "g3" remains active

  @edge-case
  Scenario: Unassign a group never assigned is a no-op
    Given group "g9" is not assigned to category "c1"
    When the unassign operation is invoked
    Then the system does not raise an error
    And no rows are affected

  @happy-path
  Scenario: List groups for a category
    Given category "c1" with groups "g1" (sortOrder 2), "g2" (sortOrder 1)
    When the list of category groups is requested
    Then the system returns groups "g2", "g1" in that order

  @edge-case
  Scenario: List groups excludes archived
    Given category "c1" assigned to groups "g1" (active) and "g5" (archived)
    When the list of category groups is requested
    Then only group "g1" is returned

  @edge-case
  Scenario: List groups for category with no assignments
    Given category "c9" with no group assignments
    When the list of category groups is requested
    Then the system returns an empty list

  @happy-path
  Scenario: List groups for a product
    Given product "p1" with groups "g3" (sortOrder 1), "g4" (sortOrder 0)
    When the list of product groups is requested
    Then the system returns groups "g4", "g3" in that order

  @edge-case
  Scenario: List product groups excludes archived
    Given product "p1" assigned to groups "g3" (active) and "g6" (archived)
    When the list of product groups is requested
    Then only group "g3" is returned

  @edge-case
  Scenario: List groups for product with no assignments
    Given product "p9" with no group assignments
    When the list of product groups is requested
    Then the system returns an empty list

  @happy-path
  Scenario: Merge disjoint category and product groups
    Given product "p1" in category "c1"
    And category "c1" has groups "g1", "g2"
    And product "p1" has groups "g3"
    When the effective groups for "p1" are resolved
    Then the result contains groups "g1", "g2", "g3" with no duplicates

  @happy-path
  Scenario: Product assignment wins on conflict
    Given product "p1" in category "c1"
    And category "c1" has group "g1"
    And product "p1" has group "g1"
    When the effective groups for "p1" are resolved
    Then "g1" appears exactly once in the result
    And the source of the entry is the product assignment

  @edge-case
  Scenario: Product with no category and no product assignments
    Given product "p9" with no category assignments and no product assignments
    When the effective groups for "p9" are resolved
    Then the result is an empty list

  @edge-case
  Scenario: Product in category with no assignments but with product assignments
    Given product "p1" in category "c1"
    And category "c1" has no group assignments
    And product "p1" has groups "g3", "g4"
    When the effective groups for "p1" are resolved
    Then the result contains groups "g3", "g4"

  @edge-case
  Scenario: Archived groups excluded from effective resolution
    Given product "p1" in category "c1"
    And category "c1" has group "g1" (active) and group "g2" (archived)
    And product "p1" has group "g3" (active)
    When the effective groups for "p1" are resolved
    Then the result contains only "g1" and "g3"