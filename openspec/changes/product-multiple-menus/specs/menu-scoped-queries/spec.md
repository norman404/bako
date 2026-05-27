# Menu-Scoped Queries Specification

## Purpose

Define how repositories and use-cases filter products and categories by one or more menu IDs, leveraging the `product_menus` junction table.

## Requirements

### Requirement: Filter Products by Menu IDs

The `ProductRepository.listProducts(menuIds?: string[])` method MUST return only products assigned to at least one of the provided menu IDs.

#### Scenario: Query products for single menu

- GIVEN products "p1" (menus: m1, m2), "p2" (menus: m2), "p3" (menus: m1)
- WHEN `listProducts(menuIds: ["m1"])` is called
- THEN the result MUST contain "p1" and "p3"
- AND MUST NOT contain "p2"

#### Scenario: Query products for multiple menus (union)

- GIVEN products "p1" (menus: m1), "p2" (menus: m2), "p3" (menus: m1, m2)
- WHEN `listProducts(menuIds: ["m1", "m2"])` is called
- THEN the result MUST contain "p1", "p2", "p3"

#### Scenario: Query all products (no filter)

- GIVEN products "p1", "p2", "p3"
- WHEN `listProducts(menuIds: undefined)` is called
- THEN the result MUST contain ALL products regardless of menu assignments

#### Scenario: Query for non-existent menu

- GIVEN no products assigned to menu "m99"
- WHEN `listProducts(menuIds: ["m99"])` is called
- THEN the result MUST be an empty array `[]`

---

### Requirement: Join Optimization

The `ProductRepository.listProducts(menuIds)` implementation MUST use a SQL INNER JOIN between `products` and `product_menus` when `menuIds` is provided.

#### Scenario: SQL join used when filtering by menu

- GIVEN a query `listProducts(menuIds: ["m1"])`
- WHEN executed in Drizzle repository
- THEN the SQL MUST include `INNER JOIN product_menus ON products.id = product_menus.product_id`
- AND WHERE clause MUST include `product_menus.menu_id IN ("m1")`

#### Scenario: No join when no filter

- GIVEN a query `listProducts(menuIds: undefined)`
- WHEN executed in Drizzle repository
- THEN the SQL MUST query `products` table directly without join

---

### Requirement: Filter Categories by Menu

The `CategoryRepository.listCategories(menuId?: string)` method SHOULD return only categories that have at least one product assigned to the given menu.

#### Scenario: Category visible only if it has products in menu

- GIVEN category "Bebidas" with products "p1" (menus: m1), "p2" (menus: m2)
- WHEN `listCategories(menuId: "m1")` is called
- THEN the result MUST contain "Bebidas" because "p1" is in menu "m1"

#### Scenario: Category hidden if no products in menu

- GIVEN category "Postres" with products "p3" (menus: m2)
- WHEN `listCategories(menuId: "m1")` is called
- THEN the result MUST NOT contain "Postres"

#### Scenario: All categories when no menu filter

- GIVEN categories "Bebidas", "Postres"
- WHEN `listCategories(menuId: undefined)` is called
- THEN the result MUST contain ALL categories

---

### Requirement: Product Count per Category (Menu-Scoped)

When querying categories with a menu filter, the `productCount` field in each `Category` MUST reflect only products assigned to that menu.

#### Scenario: Product count filtered by menu

- GIVEN category "Bebidas" with products "p1" (menus: m1, m2), "p2" (menus: m1), "p3" (menus: m2)
- WHEN `listCategories(menuId: "m1")` is called
- THEN category "Bebidas" MUST have `productCount: 2` (p1, p2 only)

#### Scenario: Product count without menu filter

- GIVEN category "Bebidas" with products "p1", "p2", "p3"
- WHEN `listCategories(menuId: undefined)` is called
- THEN category "Bebidas" MUST have `productCount: 3`

---

### Requirement: Use-Case Pass-Through

All use-cases in `src/modules/menu/use-cases/` MUST accept and forward `menuIds` or `menuId` parameters to their respective repositories without transformation.

#### Scenario: listProducts use-case forwards menuIds

- GIVEN a use-case call `listProducts(repository, menuIds: ["m1"])`
- WHEN executed
- THEN it MUST call `repository.listProducts(menuIds: ["m1"])`

#### Scenario: listCategories use-case forwards menuId

- GIVEN a use-case call `listCategories(repository, menuId: "m1")`
- WHEN executed
- THEN it MUST call `repository.listCategories(menuId: "m1")`
