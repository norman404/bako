# Menu Browsing Specification

## Purpose

Define how users browse products and categories in the POS UI with respect to the active menu, ensuring only products assigned to the active menu are visible.

## Requirements

### Requirement: Display Products for Active Menu Only

The `ProductGrid` component MUST display only products assigned to the currently active menu.

#### Scenario: Show products assigned to active menu

- GIVEN products "Café" (menus: Desayuno, Merienda), "Hamburguesa" (menus: Almuerzo)
- WHEN the active menu is "Desayuno"
- THEN the ProductGrid MUST display "Café"
- AND MUST NOT display "Hamburguesa"

#### Scenario: Show products when switching active menu

- GIVEN products "Café" (menus: Desayuno), "Té" (menus: Merienda)
- WHEN the active menu changes from "Desayuno" to "Merienda"
- THEN the ProductGrid MUST update to display "Té" only

#### Scenario: Empty grid when no products assigned to menu

- GIVEN no products assigned to menu "Almuerzo"
- WHEN the active menu is "Almuerzo"
- THEN the ProductGrid MUST display an empty state

---

### Requirement: Filter Categories by Active Menu

The `CategoryNav` component MUST display only categories that have at least one product assigned to the active menu.

#### Scenario: Show category with products in active menu

- GIVEN category "Bebidas" with products "Café" (menus: Desayuno), "Té" (menus: Merienda)
- WHEN the active menu is "Desayuno"
- THEN the CategoryNav MUST display "Bebidas"

#### Scenario: Hide category with no products in active menu

- GIVEN category "Postres" with products "Brownie" (menus: Merienda)
- WHEN the active menu is "Desayuno"
- THEN the CategoryNav MUST NOT display "Postres"

#### Scenario: Update visible categories on menu switch

- GIVEN categories "Bebidas" (has products in Desayuno), "Postres" (has products in Merienda)
- WHEN the active menu changes from "Desayuno" to "Merienda"
- THEN the CategoryNav MUST hide "Bebidas" (if no Merienda products)
- AND MUST show "Postres"

---

### Requirement: Product Count Reflects Active Menu

When displaying a category, the `productCount` MUST reflect only products assigned to the active menu.

#### Scenario: Product count filtered by active menu

- GIVEN category "Bebidas" with products "Café" (menus: Desayuno, Merienda), "Té" (menus: Merienda)
- WHEN the active menu is "Desayuno"
- THEN category "Bebidas" MUST display `productCount: 1`

#### Scenario: Product count updates on menu switch

- GIVEN category "Bebidas" with "Café" (menus: Desayuno, Merienda), "Té" (menus: Merienda)
- WHEN the active menu changes from "Desayuno" to "Merienda"
- THEN category "Bebidas" MUST update to `productCount: 2`

---

### Requirement: Active Menu Context from Store

The ProductGrid and CategoryNav components MUST retrieve the active menu ID from the global state store and pass it as `menuIds: [activeMenuId]` to the respective hooks.

#### Scenario: Use active menu from store

- GIVEN the menu store has `activeMenuId: "m1"`
- WHEN ProductGrid renders
- THEN it MUST call `useProducts({ menuIds: ["m1"] })`

#### Scenario: React to store changes

- GIVEN ProductGrid is mounted with `activeMenuId: "m1"`
- WHEN the store updates `activeMenuId` to "m2"
- THEN ProductGrid MUST re-query with `useProducts({ menuIds: ["m2"] })`

---

### Requirement: No Menu Filter in Admin Context

When in admin/settings context (outside the POS flow), product and category queries SHOULD NOT apply menu filters.

#### Scenario: Admin views all products regardless of menu

- GIVEN an admin is in the product management screen
- WHEN listing products
- THEN the query MUST call `useProducts({ menuIds: undefined })`
- AND display all products regardless of menu assignments

#### Scenario: Admin views all categories regardless of menu

- GIVEN an admin is in the category management screen
- WHEN listing categories
- THEN the query MUST call `useCategories({ menuId: undefined })`
- AND display all categories
