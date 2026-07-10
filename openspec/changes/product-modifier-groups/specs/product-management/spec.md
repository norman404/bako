# Delta for product-management

## ADDED Requirements

### Requirement: Product Modifier Group Assignment

The system MUST allow assigning modifier groups directly to a product via a `product_modifier_groups` junction table with columns `product_id` (TEXT) and `group_id` (TEXT), composite PRIMARY KEY, and CASCADE foreign keys to `products(id)` and `modifier_groups(id)`. A product MAY be assigned to zero, one, or multiple modifier groups; the assignment MUST be represented in the `Product` domain type as `modifierGroupIds: string[]`.

#### Scenario: Assign modifier group to a product

- GIVEN a product "Café" with id "p1" and a modifier group "Nivel de hielo" with id "g1"
- WHEN the product is assigned to the modifier group
- THEN a row `(product_id: "p1", group_id: "g1")` EXISTS in `product_modifier_groups`
- AND the domain `Product` for "p1" has `modifierGroupIds: ["g1"]`

#### Scenario: Product assigned to zero modifier groups

- GIVEN a product "Té" with id "p2" with no direct modifier group assignments
- WHEN queried from persistence
- THEN the domain `Product` has `modifierGroupIds: []`
- AND no rows exist in `product_modifier_groups` for `product_id = "p2"`

#### Scenario: Product assigned to multiple modifier groups

- GIVEN a product "Café" with id "p1" assigned to groups "g1" and "g2"
- WHEN queried from persistence
- THEN the domain `Product` has `modifierGroupIds: ["g1", "g2"]`

#### Scenario: Cascade delete on product removal

- GIVEN a product "p1" assigned to modifier groups "g1", "g2"
- WHEN the product is deleted
- THEN ALL rows in `product_modifier_groups` WHERE `product_id = "p1"` MUST be deleted

#### Scenario: Cascade delete on modifier group removal

- GIVEN modifier group "g1" assigned to products "p1", "p2"
- WHEN the modifier group "g1" is deleted
- THEN ALL rows in `product_modifier_groups` WHERE `group_id = "g1"` MUST be deleted
- AND products "p1" and "p2" remain in the `products` table

---

### Requirement: Effective Modifier Groups per Product

When listing products, each returned `Product` MUST include its **effective modifier groups**: the merge of (a) modifier groups assigned to the product's category and (b) modifier groups assigned directly to the product. The merge MUST deduplicate by `group_id`; where the same `group_id` appears in both the category assignment and the product assignment, the product-level assignment MUST win (no duplicate entries).

#### Scenario: Effective groups merge category and product assignments

- GIVEN category "c1" assigned to group "g1"
- AND product "p1" in category "c1" assigned to group "g2"
- WHEN listing products
- THEN the effective modifier groups for "p1" MUST contain "g1" and "g2"

#### Scenario: Dedup by group_id with product assignment winning

- GIVEN category "c1" assigned to group "g1"
- AND product "p1" in category "c1" also assigned to group "g1"
- WHEN listing products
- THEN the effective modifier groups for "p1" MUST contain exactly one entry for "g1"

#### Scenario: Product with no category and no direct assignments

- GIVEN a product "p2" with no category and no direct modifier group assignments
- WHEN listing products
- THEN the effective modifier groups for "p2" MUST be empty

#### Scenario: Effective groups exclude archived modifier groups

- GIVEN category "c1" assigned to group "g1" where "g1" is archived (`deleted_at` IS NOT NULL)
- AND product "p1" in category "c1" with no direct assignments
- WHEN listing products
- THEN the effective modifier groups for "p1" MUST be empty

---

### Requirement: Product Modifier Badge in Admin Grid

The admin `ProductGrid` component SHOULD display a visual badge/indicator on product cards whose effective modifier groups set is non-empty. The badge MUST be hidden when the product has no effective modifier groups.

#### Scenario: Badge shown on product with effective modifier groups

- GIVEN a product "Café" with effective modifier groups ["g1", "g2"]
- WHEN the admin ProductGrid renders the card for "Café"
- THEN the card MUST display a visual badge indicating modifiers are present

#### Scenario: Badge hidden on product without modifier groups

- GIVEN a product "Té" with effective modifier groups `[]`
- WHEN the admin ProductGrid renders the card for "Té"
- THEN the card MUST NOT display any modifier badge

## MODIFIED Requirements

### Requirement: Create Product with Menu Assignments

The system MUST allow creating a product with a specified set of menu IDs AND an optional set of modifier group IDs via `createProduct(input: CreateProductInput)`. The input MAY include `modifierGroupIds: string[]`; when omitted, it defaults to an empty array. The system MUST reject creation if any `modifierGroupIds` value does not exist in the `modifier_groups` table.

(Previously: Create product only accepted menu assignments; no modifier group field existed.)

#### Scenario: Create product assigned to multiple menus and modifier groups

- GIVEN a valid product input with `name: "Café con leche"`, `categoryId: "c1"`, `price: 500`, `menuIds: ["m1", "m2"]`, `modifierGroupIds: ["g1", "g2"]`
- WHEN `createProduct` is called
- THEN a new product is inserted into the `products` table
- AND rows `(product_id, m1)` and `(product_id, m2)` are inserted into `product_menus`
- AND rows `(product_id, g1)` and `(product_id, g2)` are inserted into `product_modifier_groups`

#### Scenario: Create product with zero menus and zero modifier groups

- GIVEN a valid product input with `menuIds: []` and `modifierGroupIds: []`
- WHEN `createProduct` is called
- THEN a new product is inserted into `products`
- AND NO rows are inserted into `product_menus`
- AND NO rows are inserted into `product_modifier_groups`

#### Scenario: Create product without modifierGroupIds (backward compatibility)

- GIVEN a valid product input with `menuIds: ["m1"]` and `modifierGroupIds` omitted
- WHEN `createProduct` is called
- THEN a new product is inserted into `products`
- AND the resulting `Product.modifierGroupIds` MUST be `[]`

#### Scenario: Reject invalid menu IDs

- GIVEN a product input with `menuIds: ["m99"]` where "m99" does not exist
- WHEN `createProduct` is called
- THEN the system MUST return an error "Menu not found"

#### Scenario: Reject invalid modifier group IDs

- GIVEN a product input with `modifierGroupIds: ["g99"]` where "g99" does not exist
- WHEN `createProduct` is called
- THEN the system MUST return an error "Modifier group not found"
- AND no product or junction rows are created

---

### Requirement: Update Product Menu Assignments

The system MUST allow updating a product's menu assignments AND modifier group assignments by replacing the existing sets with the new sets via `updateProduct(id: string, input: UpdateProductInput)`. The input MAY include `modifierGroupIds: string[]`; when omitted, existing modifier group assignments MUST remain unchanged. When provided, the system MUST replace all existing `product_modifier_groups` rows for the product with the new set. The system MUST reject update if any `modifierGroupIds` value does not exist in the `modifier_groups` table.

(Previously: Update only replaced menu assignments; no modifier group field existed.)

#### Scenario: Replace menu and modifier group assignments

- GIVEN a product "p1" currently assigned to menus "m1", "m2" and modifier groups "g1"
- WHEN `updateProduct(id: "p1", input: { menuIds: ["m2", "m3"], modifierGroupIds: ["g2"] })` is called
- THEN all existing rows in `product_menus` for "p1" are deleted and replaced with `(p1, m2)`, `(p1, m3)`
- AND all existing rows in `product_modifier_groups` for "p1" are deleted and replaced with `(p1, g2)`

#### Scenario: Update product without changing menu or modifier group assignments

- GIVEN a product "p1" with `menuIds: ["m1"]` and `modifierGroupIds: ["g1"]`
- WHEN `updateProduct(id: "p1", input: { name: "New Name" })` is called (menuIds and modifierGroupIds omitted)
- THEN the product name is updated
- AND menu assignments in `product_menus` remain unchanged
- AND modifier group assignments in `product_modifier_groups` remain unchanged

#### Scenario: Clear all menu assignments while preserving modifier groups

- GIVEN a product "p1" assigned to menus "m1", "m2" and modifier groups "g1"
- WHEN `updateProduct(id: "p1", input: { menuIds: [] })` is called (modifierGroupIds omitted)
- THEN all rows in `product_menus` for "p1" are deleted
- AND rows in `product_modifier_groups` for "p1" remain unchanged

#### Scenario: Clear all modifier group assignments while preserving menus

- GIVEN a product "p1" assigned to menus "m1" and modifier groups "g1", "g2"
- WHEN `updateProduct(id: "p1", input: { modifierGroupIds: [] })` is called (menuIds omitted)
- THEN all rows in `product_modifier_groups` for "p1" are deleted
- AND rows in `product_menus` for "p1" remain unchanged

#### Scenario: Reject update with non-existent modifier group

- GIVEN a product "p1" with `modifierGroupIds: ["g1"]`
- WHEN `updateProduct(id: "p1", input: { modifierGroupIds: ["g99"] })` is called where "g99" does not exist
- THEN the system MUST return an error "Modifier group not found"
- AND existing `product_modifier_groups` rows for "p1" remain unchanged