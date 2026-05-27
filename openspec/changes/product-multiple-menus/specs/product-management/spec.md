# Product Management Specification

## Purpose

Define the behavior for creating, updating, deleting, and querying products with multiple menu assignments.

## Requirements

### Requirement: Create Product with Menu Assignments

The system MUST allow creating a product with a specified set of menu IDs via `createProduct(input: CreateProductInput)`.

#### Scenario: Create product assigned to multiple menus

- GIVEN a valid product input with `name: "Café con leche"`, `categoryId: "c1"`, `price: 500`, `menuIds: ["m1", "m2"]`
- WHEN `createProduct` is called
- THEN a new product is inserted into the `products` table
- AND rows `(product_id, m1)` and `(product_id, m2)` are inserted into `product_menus`

#### Scenario: Create product with zero menus

- GIVEN a valid product input with `menuIds: []`
- WHEN `createProduct` is called
- THEN a new product is inserted into `products`
- AND NO rows are inserted into `product_menus`

#### Scenario: Reject invalid menu IDs

- GIVEN a product input with `menuIds: ["m99"]` where "m99" does not exist
- WHEN `createProduct` is called
- THEN the system MUST return an error "Menu not found"

---

### Requirement: Update Product Menu Assignments

The system MUST allow updating a product's menu assignments by replacing the existing set with a new set via `updateProduct(id: string, input: UpdateProductInput)`.

#### Scenario: Replace menu assignments

- GIVEN a product "p1" currently assigned to menus "m1", "m2"
- WHEN `updateProduct(id: "p1", input: { menuIds: ["m2", "m3"] })` is called
- THEN all existing rows in `product_menus` for "p1" are deleted
- AND new rows `(p1, m2)` and `(p1, m3)` are inserted

#### Scenario: Update product without changing menu assignments

- GIVEN a product "p1" with `menuIds: ["m1"]`
- WHEN `updateProduct(id: "p1", input: { name: "New Name" })` is called (menuIds omitted)
- THEN the product name is updated
- AND menu assignments in `product_menus` remain unchanged

#### Scenario: Clear all menu assignments

- GIVEN a product "p1" assigned to menus "m1", "m2"
- WHEN `updateProduct(id: "p1", input: { menuIds: [] })` is called
- THEN all rows in `product_menus` for "p1" are deleted

---

### Requirement: Delete Product Cascades to Menu Assignments

The system MUST automatically delete all junction table rows when a product is deleted.

#### Scenario: Cascade delete on product removal

- GIVEN a product "p1" assigned to menus "m1", "m2", "m3"
- WHEN the product is deleted via `deleteProduct(id: "p1")`
- THEN the product is removed from `products`
- AND ALL rows in `product_menus` WHERE `product_id = "p1"` are deleted

---

### Requirement: List Products with Menu Filter

The system MUST support listing products filtered by one or more menu IDs via `listProducts(menuIds?: string[])`.

#### Scenario: List all products without filter

- GIVEN products "p1", "p2", "p3"
- WHEN `listProducts(menuIds: undefined)` is called
- THEN the result contains all products

#### Scenario: List products for specific menu

- GIVEN products "p1" (menus: m1, m2), "p2" (menus: m2), "p3" (menus: m3)
- WHEN `listProducts(menuIds: ["m1"])` is called
- THEN the result contains only "p1"

#### Scenario: List products for multiple menus

- GIVEN products "p1" (menus: m1), "p2" (menus: m2), "p3" (menus: m1, m2)
- WHEN `listProducts(menuIds: ["m1", "m2"])` is called
- THEN the result contains "p1", "p2", "p3"

---

### Requirement: Domain Type with menuIds Array

The `Product` domain type MUST have a `menuIds: string[]` field instead of the deprecated `menuId?: string`.

#### Scenario: Product instance includes menuIds

- GIVEN a product retrieved from persistence
- WHEN the domain object is returned
- THEN it MUST include a `menuIds: string[]` field
- AND it MAY still include the deprecated `menuId` field for backward compatibility

---

### Requirement: Validation on Creation

The system SHOULD validate that `menuIds` contains only valid menu IDs that exist in the `menus` table.

#### Scenario: Reject creation with non-existent menu

- GIVEN a product input with `menuIds: ["m1", "m99"]` where "m99" does not exist
- WHEN `createProduct` is called
- THEN the system MUST return an error "Menu m99 not found"
- AND no product or junction rows are created
