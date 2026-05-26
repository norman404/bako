# Spec: conditional-category-browsing

## Overview

The system SHALL conditionally display category navigation and filtering based on the `categories_enabled` feature flag. When OFF, all products are shown in a single unfiltered view. When ON, users can browse products by selecting categories.

## Requirements

### Flag OFF Behavior
- When `categories_enabled` is OFF, the system MUST hide the CategoryNav component entirely.
- When `categories_enabled` is OFF, the system MUST display ALL products in a single grid without any category filtering applied.
- Product data in the database MUST remain unchanged regardless of the flag state (all products retain their `category_id` foreign key).

### Flag ON Behavior
- When `categories_enabled` is ON, the system MUST display the CategoryNav component in the menu view.
- When `categories_enabled` is ON, the system MUST allow users to filter products by selecting a category from CategoryNav.
- The default behavior when the flag is ON SHALL be to show all products until a specific category is selected.

### Real-time Toggle
- When an admin toggles `categories_enabled` from ON to OFF, the CategoryNav MUST disappear immediately and the product grid MUST switch to showing all products without filtering.
- When an admin toggles `categories_enabled` from OFF to ON, the CategoryNav MUST appear immediately and the user SHOULD see all products (no category pre-selected).
- The current selected category state MUST be cleared when toggling from ON to OFF.

### UI Consistency
- The product grid layout MUST remain consistent whether categories are enabled or disabled (same card size, spacing, etc.).
- The transition between filtered and unfiltered views MUST NOT cause UI glitches or layout shifts.

## Scenarios

### Scenario: User browses menu with categories disabled
**Given** the `categories_enabled` flag is OFF  
**When** the user opens the menu view in the POS  
**Then** the system displays all products in a single grid  
**And** the CategoryNav component is not rendered  
**And** no category filter is applied to the product list

### Scenario: User browses menu with categories enabled
**Given** the `categories_enabled` flag is ON  
**And** the database contains 3 categories: "Bebidas", "Comidas", "Postres"  
**When** the user opens the menu view  
**Then** the CategoryNav component is visible  
**And** the user sees all products from all categories by default  
**When** the user clicks the "Bebidas" category  
**Then** the product grid shows only products where `category_id` matches "Bebidas"

### Scenario: Admin toggles categories OFF while user is browsing
**Given** the `categories_enabled` flag is ON  
**And** the user is viewing products filtered by the "Comidas" category  
**When** the admin toggles the `categories_enabled` flag to OFF in Settings  
**Then** the CategoryNav disappears immediately from the menu view  
**And** the product grid updates to show ALL products (no filter applied)  
**And** the user can see products from "Bebidas", "Comidas", and "Postres" together

### Scenario: Admin toggles categories ON while user is browsing
**Given** the `categories_enabled` flag is OFF  
**And** the user is viewing all products in a single grid  
**When** the admin toggles the `categories_enabled` flag to ON  
**Then** the CategoryNav appears immediately  
**And** all products remain visible (no category is pre-selected)  
**And** the user can now click a category to filter the product list

### Scenario: Category data integrity when flag is OFF
**Given** the `categories_enabled` flag is OFF  
**And** products in the database have valid `category_id` foreign keys  
**When** a developer inspects the database  
**Then** all `category_id` values MUST remain intact (not nullified)  
**And** the `categories` table MUST still exist and contain all category records

## Constraints

- The system MUST NOT delete or modify category data when `categories_enabled` is toggled.
- The CategoryNav component MUST react to the Zustand feature flag store (synchronous read, no async DB query on every render).
- The product query (list products use-case) MAY ignore the `category_id` filter when `categories_enabled` is OFF, or the UI layer MAY simply not apply a filter.
- Admin panel (SettingsModal) MUST still allow editing categories even when `categories_enabled` is OFF (managing categories is independent of browsing).

## Acceptance Criteria

- [ ] User sees all products in a single grid when `categories_enabled` is OFF.
- [ ] User sees CategoryNav and can filter by category when `categories_enabled` is ON.
- [ ] Toggling the flag from ON to OFF immediately hides CategoryNav and removes filtering.
- [ ] Toggling the flag from OFF to ON immediately shows CategoryNav.
- [ ] Product database records remain unchanged when the flag is toggled.
- [ ] Unit tests verify the conditional rendering logic.
- [ ] DOM tests verify CategoryNav visibility reacts to the feature flag.
