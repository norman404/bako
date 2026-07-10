# Modifier Group Assignment Specification

## Purpose

Define how reusable modifier groups are assigned to categories and/or products as independent templates, how assignments are removed, and how the effective set of modifier groups for a product is resolved by merging category-level and product-level assignments with deduplication.

## Requirements

### Requirement: Category Assignment

The system MUST store category-level modifier group assignments in a `category_modifier_groups` junction table with columns `category_id` (TEXT) and `group_id` (TEXT), composite PRIMARY KEY `(category_id, group_id)`, and CASCADE foreign keys to `categories(id)` and `modifier_groups(id)`.

#### Scenario: Assign a group to a category

- GIVEN a category "Bebidas" with id "c1" and a modifier group "Nivel de hielo" with id "g1"
- WHEN the group is assigned to the category
- THEN a row `(category_id: "c1", group_id: "g1")` EXISTS in `category_modifier_groups`

#### Scenario: Prevent duplicate category assignment

- GIVEN group "g1" already assigned to category "c1"
- WHEN the same assignment is attempted again
- THEN the system MUST reject with a unique constraint violation

#### Scenario: Cascade delete on category removal

- GIVEN category "c1" with groups "g1", "g2" assigned
- WHEN category "c1" is deleted
- THEN ALL rows in `category_modifier_groups` WHERE `category_id = "c1"` MUST be deleted
- AND groups "g1", "g2" remain in `modifier_groups`

#### Scenario: Archive modifier group removes category assignments

- GIVEN group "g1" assigned to categories "c1", "c2"
- WHEN group "g1" is archived
- THEN ALL rows in `category_modifier_groups` WHERE `group_id = "g1"` MUST be removed

---

### Requirement: Product Assignment

The system MUST store product-level modifier group assignments in a `product_modifier_groups` junction table with columns `product_id` (TEXT) and `group_id` (TEXT), composite PRIMARY KEY `(product_id, group_id)`, and CASCADE foreign keys to `products(id)` and `modifier_groups(id)`.

#### Scenario: Assign a group to a product

- GIVEN a product "Capuchino" with id "p1" and a modifier group "Leche alternativa" with id "g3"
- WHEN the group is assigned to the product
- THEN a row `(product_id: "p1", group_id: "g3")` EXISTS in `product_modifier_groups`

#### Scenario: Prevent duplicate product assignment

- GIVEN group "g3" already assigned to product "p1"
- WHEN the same assignment is attempted again
- THEN the system MUST reject with a unique constraint violation

#### Scenario: Cascade delete on product removal

- GIVEN product "p1" with groups "g3", "g4" assigned
- WHEN product "p1" is deleted
- THEN ALL rows in `product_modifier_groups` WHERE `product_id = "p1"` MUST be deleted
- AND groups "g3", "g4" remain in `modifier_groups`

#### Scenario: Archive modifier group removes product assignments

- GIVEN group "g3" assigned to products "p1", "p2"
- WHEN group "g3" is archived
- THEN ALL rows in `product_modifier_groups` WHERE `group_id = "g3"` MUST be removed

---

### Requirement: Unassign Modifier Group

The system MUST allow removing a modifier group assignment from a category or from a product without affecting the group itself or other assignments.

#### Scenario: Unassign group from category

- GIVEN group "g1" assigned to category "c1"
- WHEN the assignment is removed
- THEN the row `(c1, g1)` no longer exists in `category_modifier_groups`
- AND group "g1" remains active in `modifier_groups`

#### Scenario: Unassign group from product

- GIVEN group "g3" assigned to product "p1"
- WHEN the assignment is removed
- THEN the row `(p1, g3)` no longer exists in `product_modifier_groups`
- AND group "g3" remains active

#### Scenario: Unassign a group never assigned is a no-op

- GIVEN group "g9" is not assigned to category "c1"
- WHEN the unassign operation is invoked
- THEN the system SHOULD NOT raise an error
- AND no rows are affected

---

### Requirement: List Assignments for a Category

The system MUST allow listing all active modifier groups assigned to a specific category, ordered by `sortOrder` ascending. Archived groups MUST be excluded from the listing.

#### Scenario: List groups for a category

- GIVEN category "c1" with groups "g1" (sortOrder 2), "g2" (sortOrder 1)
- WHEN the list of category groups is requested
- THEN the system returns groups "g2", "g1" in that order

#### Scenario: List groups excludes archived

- GIVEN category "c1" assigned to groups "g1" (active) and "g5" (archived)
- WHEN the list of category groups is requested
- THEN only group "g1" is returned

#### Scenario: List groups for category with no assignments

- GIVEN category "c9" with no group assignments
- WHEN the list of category groups is requested
- THEN the system returns an empty list

---

### Requirement: List Assignments for a Product

The system MUST allow listing all active modifier groups assigned to a specific product, ordered by `sortOrder` ascending. Archived groups MUST be excluded from the listing.

#### Scenario: List groups for a product

- GIVEN product "p1" with groups "g3" (sortOrder 1), "g4" (sortOrder 0)
- WHEN the list of product groups is requested
- THEN the system returns groups "g4", "g3" in that order

#### Scenario: List product groups excludes archived

- GIVEN product "p1" assigned to groups "g3" (active) and "g6" (archived)
- WHEN the list of product groups is requested
- THEN only group "g3" is returned

#### Scenario: List groups for product with no assignments

- GIVEN product "p9" with no group assignments
- WHEN the list of product groups is requested
- THEN the system returns an empty list

---

### Requirement: Resolve Effective Modifier Groups for a Product

The system MUST resolve the effective set of modifier groups for a product by merging category-level and product-level assignments, deduplicating by `group_id`. When the same `group_id` is assigned at both category and product level, the product-level assignment MUST win (no duplicate entry in the result). The merged result MUST be ordered by `sortOrder` ascending.

#### Scenario: Merge disjoint category and product groups

- GIVEN product "p1" in category "c1"
- AND category "c1" has groups "g1", "g2"
- AND product "p1" has groups "g3"
- WHEN the effective groups for "p1" are resolved
- THEN the result contains groups "g1", "g2", "g3" with no duplicates

#### Scenario: Product assignment wins on conflict

- GIVEN product "p1" in category "c1"
- AND category "c1" has group "g1"
- AND product "p1" has group "g1"
- WHEN the effective groups for "p1" are resolved
- THEN "g1" appears exactly once in the result
- AND the source of the entry is the product assignment

#### Scenario: Product with no category and no product assignments

- GIVEN product "p9" with no category assignments and no product assignments
- WHEN the effective groups for "p9" are resolved
- THEN the result is an empty list

#### Scenario: Product in category with no assignments but with product assignments

- GIVEN product "p1" in category "c1"
- AND category "c1" has no group assignments
- AND product "p1" has groups "g3", "g4"
- WHEN the effective groups for "p1" are resolved
- THEN the result contains groups "g3", "g4"

#### Scenario: Archived groups excluded from effective resolution

- GIVEN product "p1" in category "c1"
- AND category "c1" has group "g1" (active) and group "g2" (archived)
- AND product "p1" has group "g3" (active)
- WHEN the effective groups for "p1" are resolved
- THEN the result contains only "g1" and "g3"