# Category Management Specification

## Purpose

Define how categories are queried and managed with respect to menu-scoped product visibility.

## Requirements

### Requirement: List Categories with Optional Menu Filter

The `CategoryRepository.listCategories(menuId?: string)` method MUST return all categories when `menuId` is undefined, and only categories with products in the specified menu when `menuId` is provided.

#### Scenario: List all categories without filter

- GIVEN categories "Bebidas", "Postres", "Platos"
- WHEN `listCategories(menuId: undefined)` is called
- THEN the result MUST contain all three categories

#### Scenario: List categories with products in menu

- GIVEN category "Bebidas" with products "Café" (menus: Desayuno), "Té" (menus: Merienda)
- WHEN `listCategories(menuId: "Desayuno")` is called
- THEN the result MUST contain "Bebidas"

#### Scenario: Exclude categories with no products in menu

- GIVEN category "Postres" with products "Brownie" (menus: Merienda)
- WHEN `listCategories(menuId: "Desayuno")` is called
- THEN the result MUST NOT contain "Postres"

---

### Requirement: Menu-Scoped Product Count

When listing categories with a `menuId` filter, the `productCount` field MUST reflect only products assigned to that menu.

#### Scenario: Product count filtered by menu

- GIVEN category "Bebidas" with products "Café" (menus: Desayuno, Merienda), "Té" (menus: Merienda), "Jugo" (menus: Desayuno)
- WHEN `listCategories(menuId: "Desayuno")` is called
- THEN category "Bebidas" MUST have `productCount: 2` (Café, Jugo)

#### Scenario: Product count without filter

- GIVEN category "Bebidas" with products "Café", "Té", "Jugo"
- WHEN `listCategories(menuId: undefined)` is called
- THEN category "Bebidas" MUST have `productCount: 3`

---

### Requirement: Category Remains Independent of Menus

The `categories` table and `Category` domain type MUST NOT store menu associations. Categories are scoped to menus only through their products.

#### Scenario: Category exists even if no products in any menu

- GIVEN a category "Postres" with products "Brownie" (menuIds: [])
- WHEN `listCategories(menuId: undefined)` is called
- THEN the result MUST contain "Postres" with `productCount: 1`

#### Scenario: Category hidden in menu filter if all products unassigned

- GIVEN category "Postres" with products "Brownie" (menuIds: [])
- WHEN `listCategories(menuId: "Desayuno")` is called
- THEN the result MUST NOT contain "Postres"

---

### Requirement: Use-Case Forwards Menu Filter

The `listCategories` use-case MUST accept a `menuId?: string` parameter and forward it to the repository.

#### Scenario: Use-case forwards menuId to repository

- GIVEN a use-case call `listCategories(repository, menuId: "m1")`
- WHEN executed
- THEN it MUST call `repository.listCategories(menuId: "m1")`

#### Scenario: Use-case forwards undefined menuId

- GIVEN a use-case call `listCategories(repository, menuId: undefined)`
- WHEN executed
- THEN it MUST call `repository.listCategories(menuId: undefined)`

---

### Requirement: Repository Joins Products and Product_Menus

When `menuId` is provided, the repository implementation MUST join the `categories`, `products`, and `product_menus` tables to filter and count correctly.

#### Scenario: SQL join when menuId provided

- GIVEN a query `listCategories(menuId: "m1")`
- WHEN executed in Drizzle repository
- THEN the SQL MUST join `categories` → `products` → `product_menus`
- AND WHERE clause MUST include `product_menus.menu_id = "m1"`

#### Scenario: No product_menus join when menuId is undefined

- GIVEN a query `listCategories(menuId: undefined)`
- WHEN executed in Drizzle repository
- THEN the SQL MAY join `categories` → `products` for count
- AND MUST NOT join `product_menus`
