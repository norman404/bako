# Admin Product-Menu Assignment Specification

## Purpose

Define the admin UI for assigning products to multiple menus during product creation and editing.

## Requirements

### Requirement: Multi-Select Menu UI in ProductForm

The `ProductForm` component MUST provide a multi-select control (checkboxes or multi-select dropdown) to assign a product to zero or more menus.

#### Scenario: Display all available menus

- GIVEN menus "Desayuno", "Almuerzo", "Merienda" exist
- WHEN the ProductForm is rendered
- THEN the menu selection control MUST display all three menus as options

#### Scenario: Pre-select assigned menus when editing

- GIVEN a product "Café" assigned to menus "Desayuno", "Merienda"
- WHEN ProductForm is opened in edit mode for "Café"
- THEN checkboxes for "Desayuno" and "Merienda" MUST be checked
- AND "Almuerzo" MUST be unchecked

#### Scenario: Allow zero menu selection

- GIVEN a new product form
- WHEN the user leaves all menu checkboxes unchecked
- THEN the form MUST accept the input
- AND submit `menuIds: []`

---

### Requirement: Submit Menu Assignments on Save

When the ProductForm is submitted, the system MUST send the selected menu IDs to the `createProduct` or `updateProduct` mutation.

#### Scenario: Create product with multiple menus

- GIVEN a user creates a product "Café con leche"
- WHEN the user selects menus "Desayuno", "Merienda" and submits
- THEN the `createProduct` mutation MUST be called with `menuIds: ["m1", "m2"]`

#### Scenario: Update product menu assignments

- GIVEN a product "Té" currently assigned to "Merienda"
- WHEN the user edits and selects "Desayuno", "Merienda", then submits
- THEN the `updateProduct` mutation MUST be called with `menuIds: ["m1", "m2"]`

#### Scenario: Remove all menu assignments

- GIVEN a product "Jugo" assigned to "Desayuno"
- WHEN the user unchecks all menus and submits
- THEN the `updateProduct` mutation MUST be called with `menuIds: []`

---

### Requirement: Visual Feedback on Validation

The ProductForm SHOULD provide visual feedback if business rules require at least one menu assignment.

#### Scenario: Display error if menuIds is required but empty

- GIVEN a validation rule that products MUST have at least one menu
- WHEN the user submits a product with `menuIds: []`
- THEN the form MUST display an error message "El producto debe estar asignado a al menos un menú"
- AND prevent submission

#### Scenario: Clear error when menus selected

- GIVEN the form is showing a "menu required" error
- WHEN the user selects at least one menu
- THEN the error message MUST be cleared

---

### Requirement: Mutation Integration

The `useCreateProduct` and `useUpdateProduct` hooks MUST accept `menuIds: string[]` in their input and forward it to the use-case.

#### Scenario: useCreateProduct accepts menuIds

- GIVEN a hook call `createProduct.mutate({ name: "Café", categoryId: "c1", menuIds: ["m1", "m2"], price: 500 })`
- WHEN the mutation runs
- THEN it MUST call the use-case with `menuIds: ["m1", "m2"]`

#### Scenario: useUpdateProduct accepts menuIds

- GIVEN a hook call `updateProduct.mutate({ id: "p1", menuIds: ["m1"] })`
- WHEN the mutation runs
- THEN it MUST call the use-case with the updated `menuIds`

---

### Requirement: Query Invalidation After Assignment

After a successful product creation or update with menu assignments, the system MUST invalidate the product query cache to reflect updated menu-scoped queries.

#### Scenario: Invalidate product queries on create

- GIVEN a product "Café" is created with `menuIds: ["m1", "m2"]`
- WHEN the `createProduct` mutation succeeds
- THEN the system MUST invalidate queries with key `["products"]`

#### Scenario: Invalidate product queries on update

- GIVEN a product "Té" menu assignment is updated
- WHEN the `updateProduct` mutation succeeds
- THEN the system MUST invalidate queries with key `["products"]`
