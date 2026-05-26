# Spec: menu-browsing (Delta)

## Overview

This is a DELTA spec. The menu-browsing capability is extended to conditionally render UI components (CategoryNav, menu selector) based on active feature flags.

## Requirements (MODIFIED)

### Conditional CategoryNav Rendering
- The menu view in `App.tsx` (or equivalent menu layout component) MUST conditionally render the CategoryNav component based on the `categories_enabled` feature flag.
- When `categories_enabled` is OFF, the CategoryNav MUST NOT be rendered.
- When `categories_enabled` is ON, the CategoryNav MUST be rendered in its usual position.

### Conditional Menu Selector Rendering
- The menu view MUST conditionally render a menu selector component based on the `multiple_menus_enabled` feature flag.
- When `multiple_menus_enabled` is OFF, the menu selector MUST NOT be rendered.
- When `multiple_menus_enabled` is ON, the menu selector MUST be rendered in a prominent position (e.g., top-left of the menu view or in the header).

### Product Filtering Logic
- When `categories_enabled` is OFF, the product list query MUST NOT apply any category filter (show all products).
- When `categories_enabled` is ON, the product list query MUST respect the selected category from CategoryNav.
- When `multiple_menus_enabled` is ON, the product list and category list queries MUST filter by the currently selected menu.
- When `multiple_menus_enabled` is OFF, the product list and category list queries MUST NOT filter by menu (show all products and categories).

### Flag State Source
- The menu view components MUST read feature flag state from the Zustand feature flags store (synchronous read, no async DB query on every render).
- The Zustand store MUST be hydrated during app bootstrap (before the menu view renders).

## Scenarios

### Scenario: Menu view renders with both flags OFF
**Given** the `categories_enabled` flag is OFF  
**And** the `multiple_menus_enabled` flag is OFF  
**When** the menu view renders  
**Then** the CategoryNav is not displayed  
**And** the menu selector is not displayed  
**And** the product grid displays all products from the database (no filtering)

### Scenario: Menu view renders with categories ON, multiple menus OFF
**Given** the `categories_enabled` flag is ON  
**And** the `multiple_menus_enabled` flag is OFF  
**When** the menu view renders  
**Then** the CategoryNav is displayed  
**And** the menu selector is not displayed  
**And** the product grid displays all products (no menu filter, but category filter can be applied via CategoryNav)

### Scenario: Menu view renders with both flags ON
**Given** the `categories_enabled` flag is ON  
**And** the `multiple_menus_enabled` flag is ON  
**And** the selected menu is "Lunch Menu"  
**When** the menu view renders  
**Then** the CategoryNav is displayed showing only categories from "Lunch Menu"  
**And** the menu selector is displayed with "Lunch Menu" selected  
**And** the product grid displays only products from "Lunch Menu" (and filtered by category if one is selected)

### Scenario: User toggles categories OFF while browsing
**Given** the menu view is rendered with `categories_enabled=ON`  
**And** the user is viewing products filtered by the "Bebidas" category  
**When** the admin toggles `categories_enabled` to OFF  
**Then** the CategoryNav disappears from the menu view immediately  
**And** the product grid updates to show all products (no category filter applied)

### Scenario: User toggles multiple menus ON while browsing
**Given** the menu view is rendered with `multiple_menus_enabled=OFF`  
**And** the user is viewing all products  
**When** the admin toggles `multiple_menus_enabled` to ON  
**Then** the menu selector appears immediately  
**And** the default menu is selected (e.g., "Menu Principal")  
**And** the product grid and CategoryNav update to show only items from the default menu

### Scenario: App boots and hydrates flags before rendering menu
**Given** the app is starting up  
**And** the database contains `categories_enabled=true` and `multiple_menus_enabled=false`  
**When** the app bootstraps in `main.tsx`  
**Then** the feature flags Zustand store is hydrated with the flag values from the database  
**And** the menu view renders with CategoryNav visible and menu selector hidden

## Constraints

- The menu view MUST NOT make async feature flag queries on every render (flags must be read synchronously from Zustand).
- The conditional rendering logic MUST NOT cause layout shifts or UI glitches when flags are toggled.
- The product and category queries MUST be optimized to avoid unnecessary database joins when flags are OFF.
- The menu view component MAY extract flag-aware layout logic into sub-components to reduce complexity in `App.tsx`.

## Acceptance Criteria

- [ ] CategoryNav is hidden when `categories_enabled` is OFF and visible when ON.
- [ ] Menu selector is hidden when `multiple_menus_enabled` is OFF and visible when ON.
- [ ] Product and category queries respect the active flags (no category filter when OFF, no menu filter when OFF).
- [ ] Toggling a flag updates the menu view UI immediately.
- [ ] App bootstrap hydrates the feature flags store before rendering the menu view.
- [ ] Unit tests verify conditional rendering logic.
- [ ] DOM tests verify CategoryNav and menu selector visibility reacts to feature flags.
