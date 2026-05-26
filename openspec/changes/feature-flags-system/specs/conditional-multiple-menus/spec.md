# Spec: conditional-multiple-menus

## Overview

The system SHALL support multiple menus (e.g., "Lunch Menu", "Dinner Menu") when the `multiple_menus_enabled` feature flag is ON. When OFF, the system behaves as if a single implicit "default" menu exists, maintaining backward compatibility with the current single-menu behavior.

## Requirements

### Flag OFF Behavior
- When `multiple_menus_enabled` is OFF, the system MUST NOT display a menu selector UI.
- When `multiple_menus_enabled` is OFF, the system MUST treat all categories and products as belonging to an implicit "default" menu.
- The system MUST behave identically to the current implementation when the flag is OFF (single menu, no menu scoping).

### Flag ON Behavior
- When `multiple_menus_enabled` is ON, the system MUST display a menu selector in the menu view.
- When `multiple_menus_enabled` is ON, the system MUST show only categories and products that belong to the currently selected menu.
- Each menu MUST have a unique name (e.g., "Lunch Menu", "Dinner Menu") and an optional description.
- Categories and products MUST belong to exactly one menu when the flag is ON (enforced by foreign key `menu_id` in `categories` and `products` tables).

### Data Migration
- When the flag is first enabled (toggled from OFF to ON), the system MUST automatically create a "default" menu.
- All existing categories and products MUST be assigned to the "default" menu during the first enable operation.
- The migration MUST be idempotent (running it multiple times has no additional effect).

### Menu Selection
- When `multiple_menus_enabled` is ON, the system MUST persist the last selected menu in UI state (Zustand or local storage).
- When the user selects a different menu from the selector, the system MUST immediately update the product grid and CategoryNav to show only items from that menu.
- The system MUST load the last selected menu on app startup if `multiple_menus_enabled` is ON.

### Admin Interface
- Admins MUST be able to create, rename, and delete menus from the Settings panel (when flag is ON).
- Admins MUST be able to assign categories to a specific menu.
- Admins MUST be able to assign products to a specific menu (or inherit menu from category).
- Deleting a menu MUST fail if it contains categories or products (foreign key constraint or soft validation).

## Scenarios

### Scenario: User browses with multiple menus disabled
**Given** the `multiple_menus_enabled` flag is OFF  
**When** the user opens the menu view  
**Then** no menu selector is displayed  
**And** the user sees all categories and products as in the current implementation

### Scenario: Admin enables multiple menus for the first time
**Given** the `multiple_menus_enabled` flag is OFF  
**And** the database contains 5 categories and 20 products with no `menu_id` set  
**When** the admin toggles `multiple_menus_enabled` to ON  
**Then** the system creates a menu named "Menu Principal" (or "Default Menu")  
**And** all 5 categories are assigned `menu_id` = "Menu Principal"  
**And** all 20 products are assigned `menu_id` = "Menu Principal"  
**And** the menu selector appears in the menu view showing "Menu Principal" as the selected menu

### Scenario: User selects a different menu
**Given** the `multiple_menus_enabled` flag is ON  
**And** the database contains two menus: "Lunch Menu" and "Dinner Menu"  
**And** "Lunch Menu" has 3 categories and 15 products  
**And** "Dinner Menu" has 2 categories and 10 products  
**And** the user is currently viewing "Lunch Menu"  
**When** the user selects "Dinner Menu" from the menu selector  
**Then** the product grid updates to show only the 10 products from "Dinner Menu"  
**And** the CategoryNav shows only the 2 categories from "Dinner Menu"  
**And** the selected menu is persisted to Zustand store

### Scenario: Admin creates a new menu and assigns categories
**Given** the `multiple_menus_enabled` flag is ON  
**And** the admin opens Settings → Menus panel  
**When** the admin clicks "Create Menu"  
**And** enters the name "Breakfast Menu" and description "Available 7am-11am"  
**And** clicks "Save"  
**Then** the system creates a new menu record in the `menus` table  
**And** the menu selector in the menu view now includes "Breakfast Menu"  
**When** the admin assigns the category "Pastries" to "Breakfast Menu"  
**Then** the category `menu_id` is updated to "Breakfast Menu"  
**And** when the user selects "Breakfast Menu" in the menu view, "Pastries" appears in CategoryNav

### Scenario: Admin disables multiple menus
**Given** the `multiple_menus_enabled` flag is ON  
**And** the database contains 3 menus with categories and products assigned  
**When** the admin toggles `multiple_menus_enabled` to OFF  
**Then** the menu selector disappears immediately from the menu view  
**And** the user sees all categories and products from all menus in a single view  
**And** the `menu_id` foreign keys in the database remain intact (data is preserved)

### Scenario: App boots with multiple menus enabled
**Given** the `multiple_menus_enabled` flag is ON  
**And** the user's last selected menu was "Dinner Menu"  
**When** the app bootstraps  
**Then** the Zustand store loads "Dinner Menu" as the selected menu  
**And** the menu view displays only categories and products from "Dinner Menu"

### Scenario: Deleting a menu with products fails
**Given** the `multiple_menus_enabled` flag is ON  
**And** the menu "Lunch Menu" contains 5 products  
**When** the admin attempts to delete "Lunch Menu" from Settings  
**Then** the system displays an error: "Cannot delete menu with existing products. Reassign or delete products first."  
**And** the menu is not deleted from the database

## Constraints

- When `multiple_menus_enabled` is OFF, the `menu_id` foreign key columns MUST remain in the database schema but are ignored by queries.
- The system MUST NOT allow creating a menu with an empty name.
- The system MUST NOT allow duplicate menu names.
- A product or category MUST NOT be orphaned (must belong to a menu when flag is ON).
- The menu selector UI MUST be positioned prominently in the menu view (e.g., top-left or as a dropdown in the header).

## Acceptance Criteria

- [ ] When `multiple_menus_enabled` is OFF, no menu selector is visible and all products are shown.
- [ ] When `multiple_menus_enabled` is ON, the menu selector appears and filters categories/products by selected menu.
- [ ] Toggling the flag ON for the first time creates a default menu and assigns all existing data to it.
- [ ] User can select a menu from the selector and see only items from that menu.
- [ ] Admin can create, rename, and delete menus from Settings (when flag is ON).
- [ ] Admin can assign categories and products to a specific menu.
- [ ] Deleting a menu with products fails with a clear error message.
- [ ] App loads the last selected menu on startup when flag is ON.
- [ ] Unit tests verify menu scoping logic in domain and use-cases.
- [ ] DOM tests verify menu selector UI and filtering behavior.
