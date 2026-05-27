# Product-Menu Many-to-Many Specification

## Purpose

Define the N:M relationship between products and menus, allowing a single product to appear in zero, one, or multiple menus simultaneously.

## Requirements

### Requirement: Junction Table Persistence

The system MUST store product-menu assignments in a `product_menus` junction table with columns `product_id` (TEXT), `menu_id` (TEXT), composite PRIMARY KEY, and CASCADE foreign keys to `products(id)` and `menus(id)`.

#### Scenario: Create junction row on product assignment

- GIVEN a product with id "p1" and a menu with id "m1"
- WHEN the product is assigned to the menu
- THEN a row `(product_id: "p1", menu_id: "m1")` EXISTS in `product_menus`

#### Scenario: Prevent duplicate assignments

- GIVEN a product "p1" already assigned to menu "m1"
- WHEN the same assignment is attempted again
- THEN the system MUST reject with a unique constraint violation

#### Scenario: Cascade delete on product removal

- GIVEN a product "p1" assigned to menus "m1", "m2"
- WHEN the product is deleted
- THEN ALL rows in `product_menus` WHERE `product_id = "p1"` MUST be deleted

#### Scenario: Cascade delete on menu removal

- GIVEN menus "m1", "m2" with products "p1", "p2" assigned
- WHEN menu "m1" is deleted
- THEN ALL rows in `product_menus` WHERE `menu_id = "m1"` MUST be deleted
- AND products "p1", "p2" remain in the `products` table

---

### Requirement: Multiple Menu Assignment

A product MAY be assigned to zero, one, or multiple menus. The system MUST represent this as `menuIds: string[]` in the `Product` domain type.

#### Scenario: Product assigned to multiple menus

- GIVEN a product "Café con leche" with id "p1"
- WHEN assigned to menus "Desayuno" (m1) and "Merienda" (m2)
- THEN `product_menus` contains rows `(p1, m1)` and `(p1, m2)`
- AND the domain `Product` has `menuIds: ["m1", "m2"]`

#### Scenario: Product assigned to zero menus

- GIVEN a newly created product "p2" with no menu assignments
- WHEN queried from persistence
- THEN the domain `Product` has `menuIds: []`
- AND no rows exist in `product_menus` for `product_id = "p2"`

#### Scenario: Product assigned to single menu (backward compatibility)

- GIVEN a product "p3" assigned to only menu "m1"
- WHEN queried from persistence
- THEN the domain `Product` has `menuIds: ["m1"]`

---

### Requirement: Data Migration from 1:N to N:M

The system MUST migrate existing `products.menu_id` values to `product_menus` junction table rows during migration 0009.

#### Scenario: Migrate product with menu_id set

- GIVEN a product in `products` table with `id = "p1"`, `menu_id = "m1"`
- WHEN migration 0009 runs
- THEN a row `(product_id: "p1", menu_id: "m1")` is inserted into `product_menus`

#### Scenario: Skip products with NULL menu_id

- GIVEN a product with `id = "p2"`, `menu_id = NULL`
- WHEN migration 0009 runs
- THEN NO row is inserted into `product_menus` for "p2"

#### Scenario: Preserve products.menu_id column (deprecation)

- GIVEN migration 0009 creates `product_menus` table
- WHEN migration completes
- THEN the `products.menu_id` column MUST remain in the table
- AND it SHALL be marked as deprecated in schema comments

---

### Requirement: Update Menu Assignments

The system MUST allow updating a product's menu assignments by replacing all existing junction table rows with the new set.

#### Scenario: Replace menu assignments

- GIVEN a product "p1" currently assigned to menus "m1", "m2"
- WHEN updated to assign to menus "m2", "m3"
- THEN `product_menus` contains rows `(p1, m2)` and `(p1, m3)`
- AND row `(p1, m1)` no longer exists

#### Scenario: Remove all menu assignments

- GIVEN a product "p1" assigned to menus "m1", "m2"
- WHEN updated with `menuIds: []`
- THEN ALL rows in `product_menus` for "p1" are deleted

---

### Requirement: Database Indexing

The system SHOULD create an index on `product_menus(menu_id, product_id)` to optimize menu-scoped queries.

#### Scenario: Index used on menu-scoped product query

- GIVEN 1000 products distributed across 5 menus
- WHEN querying products for menu "m1"
- THEN the query planner SHOULD use the index `product_menus(menu_id, product_id)`
