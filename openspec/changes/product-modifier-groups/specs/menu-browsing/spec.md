# Delta for menu-browsing

## ADDED Requirements

### Requirement: Modifier Badge on Product Cards

The POS `ProductGrid` component MUST display a visual badge/indicator (e.g., a small icon or dot) on product cards whose effective modifier groups set is non-empty. The badge MUST be hidden when the product has no effective modifier groups. The badge MUST NOT be displayed when the `modifier_groups_enabled` feature flag is `false`.

#### Scenario: Badge shown on product with effective modifier groups

- GIVEN the `modifier_groups_enabled` flag is ON
- AND a product "Café" with effective modifier groups ["g1", "g2"]
- WHEN the ProductGrid renders the card for "Café"
- THEN the card MUST display a modifier badge

#### Scenario: Badge hidden on product without modifier groups

- GIVEN the `modifier_groups_enabled` flag is ON
- AND a product "Té" with effective modifier groups `[]`
- WHEN the ProductGrid renders the card for "Té"
- THEN the card MUST NOT display a modifier badge

#### Scenario: Badge suppressed when feature flag is OFF

- GIVEN the `modifier_groups_enabled` flag is OFF
- AND a product "Café" with effective modifier groups ["g1"]
- WHEN the ProductGrid renders the card for "Café"
- THEN the card MUST NOT display a modifier badge

---

### Requirement: Customization Dialog on Product Click

When the `modifier_groups_enabled` flag is ON, clicking a product card in the POS ProductGrid MUST open the `ProductCustomizationDialog` instead of adding the product directly to the cart, IF the product has at least one effective modifier group. Clicking a product WITHOUT effective modifier groups MUST add it directly to the cart (existing behavior preserved).

#### Scenario: Click product with modifiers opens dialog

- GIVEN the `modifier_groups_enabled` flag is ON
- AND a product "Café" with effective modifier groups ["g1"]
- WHEN the user clicks the "Café" card
- THEN the `ProductCustomizationDialog` MUST open for "Café"
- AND no item is added to the cart yet

#### Scenario: Click product without modifiers adds directly

- GIVEN the `modifier_groups_enabled` flag is ON
- AND a product "Té" with effective modifier groups `[]`
- WHEN the user clicks the "Té" card
- THEN "Té" MUST be added to the cart with quantity 1
- AND no dialog is opened

#### Scenario: Flag OFF always adds directly

- GIVEN the `modifier_groups_enabled` flag is OFF
- AND a product "Café" with effective modifier groups ["g1"]
- WHEN the user clicks the "Café" card
- THEN "Café" MUST be added to the cart with quantity 1 and empty modifiers
- AND no dialog is opened

---

### Requirement: Add-to-Cart Callback Carries Modifiers

The `onAddToCart` callback used by the POS ProductGrid MUST accept an optional second argument `modifiers?: SelectedModifier[]`. When provided, the cart MUST store the item with the given modifiers; when omitted, the item MUST be added with an empty modifiers array.

#### Scenario: Callback invoked with modifiers

- GIVEN the user confirms "Café" in the customization dialog with selected modifiers "Extra hielo" and "Crema"
- WHEN the dialog calls `onAddToCart("Café", [selectedModifiers])`
- THEN the cart MUST add "Café" with the two selected modifiers

#### Scenario: Callback invoked without modifiers

- GIVEN the user clicks "Té" which has no effective modifier groups
- WHEN `onAddToCart("Té")` is invoked (no second argument)
- THEN the cart MUST add "Té" with an empty modifiers array

#### Scenario: Same product with different modifiers produces distinct cart lines

- GIVEN "Café" is already in the cart with modifier "Extra hielo"
- WHEN `onAddToCart("Café", [modifier "Poco hielo"])` is invoked
- THEN the cart MUST contain two distinct lines for "Café", one with "Extra hielo" and one with "Poco hielo"
- AND the two lines MUST NOT be collapsed into a single line

## MODIFIED Requirements

### Requirement: Display Products for Active Menu Only

The `ProductGrid` component MUST display only products assigned to the currently active menu. Additionally, when the `modifier_groups_enabled` flag is ON, each displayed product card MUST surface its effective modifier groups (via badge and dialog behavior) so the user can identify and configure customizable products before adding them to the cart. When the flag is OFF, the ProductGrid MUST behave exactly as before the modifier groups feature (no badge, no dialog, direct add-to-cart).

(Previously: ProductGrid only filtered products by the active menu; no notion of modifier groups, badges, or customization dialog existed.)

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

#### Scenario: Products with modifiers show badge under active menu

- GIVEN the `modifier_groups_enabled` flag is ON
- AND the active menu is "Desayuno"
- AND "Café" (menus: Desayuno) has effective modifier groups ["g1"]
- WHEN the ProductGrid renders
- THEN "Café" MUST be displayed
- AND "Café"'s card MUST display the modifier badge

#### Scenario: Flag OFF preserves pre-modifier ProductGrid behavior

- GIVEN the `modifier_groups_enabled` flag is OFF
- AND the active menu is "Desayuno"
- AND "Café" (menus: Desayuno) has effective modifier groups ["g1"]
- WHEN the ProductGrid renders
- THEN "Café" MUST be displayed with no modifier badge
- AND clicking "Café" MUST add it directly to the cart