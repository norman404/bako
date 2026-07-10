Feature: Menu Browsing
  Delta on menu-browsing: ProductGrid surfaces a modifier badge on customizable products, opens a customization dialog when clicking products with effective modifier groups, and the add-to-cart callback carries selected modifiers. All new behavior is gated by the `modifier_groups_enabled` feature flag; when OFF, the ProductGrid behaves as before.

  # --- ADDED Requirements ---

  Scenario: Badge shown on product with effective modifier groups
    Given the `modifier_groups_enabled` flag is ON
    And a product "Café" with effective modifier groups ["g1", "g2"]
    When the ProductGrid renders the card for "Café"
    Then the card MUST display a modifier badge

  Scenario: Badge hidden on product without modifier groups
    Given the `modifier_groups_enabled` flag is ON
    And a product "Té" with effective modifier groups []
    When the ProductGrid renders the card for "Té"
    Then the card MUST NOT display a modifier badge

  Scenario: Badge suppressed when feature flag is OFF
    Given the `modifier_groups_enabled` flag is OFF
    And a product "Café" with effective modifier groups ["g1"]
    When the ProductGrid renders the card for "Café"
    Then the card MUST NOT display a modifier badge

  Scenario: Click product with modifiers opens dialog
    Given the `modifier_groups_enabled` flag is ON
    And a product "Café" with effective modifier groups ["g1"]
    When the user clicks the "Café" card
    Then the `ProductCustomizationDialog` MUST open for "Café"
    And no item is added to the cart yet

  Scenario: Click product without modifiers adds directly
    Given the `modifier_groups_enabled` flag is ON
    And a product "Té" with effective modifier groups []
    When the user clicks the "Té" card
    Then "Té" MUST be added to the cart with quantity 1
    And no dialog is opened

  Scenario: Flag OFF always adds directly
    Given the `modifier_groups_enabled` flag is OFF
    And a product "Café" with effective modifier groups ["g1"]
    When the user clicks the "Café" card
    Then "Café" MUST be added to the cart with quantity 1 and empty modifiers
    And no dialog is opened

  Scenario: Callback invoked with modifiers
    Given the user confirms "Café" in the customization dialog with selected modifiers "Extra hielo" and "Crema"
    When the dialog calls `onAddToCart("Café", [selectedModifiers])`
    Then the cart MUST add "Café" with the two selected modifiers

  Scenario: Callback invoked without modifiers
    Given the user clicks "Té" which has no effective modifier groups
    When `onAddToCart("Té")` is invoked (no second argument)
    Then the cart MUST add "Té" with an empty modifiers array

  Scenario: Same product with different modifiers produces distinct cart lines
    Given "Café" is already in the cart with modifier "Extra hielo"
    When `onAddToCart("Café", [modifier "Poco hielo"])` is invoked
    Then the cart MUST contain two distinct lines for "Café", one with "Extra hielo" and one with "Poco hielo"
    And the two lines MUST NOT be collapsed into a single line

  # --- MODIFIED Requirements ---

  Scenario: Show products assigned to active menu
    Given products "Café" (menus: Desayuno, Merienda), "Hamburguesa" (menus: Almuerzo)
    When the active menu is "Desayuno"
    Then the ProductGrid MUST display "Café"
    And MUST NOT display "Hamburguesa"

  Scenario: Show products when switching active menu
    Given products "Café" (menus: Desayuno), "Té" (menus: Merienda)
    When the active menu changes from "Desayuno" to "Merienda"
    Then the ProductGrid MUST update to display "Té" only

  Scenario: Empty grid when no products assigned to menu
    Given no products assigned to menu "Almuerzo"
    When the active menu is "Almuerzo"
    Then the ProductGrid MUST display an empty state

  Scenario: Products with modifiers show badge under active menu
    Given the `modifier_groups_enabled` flag is ON
    And the active menu is "Desayuno"
    And "Café" (menus: Desayuno) has effective modifier groups ["g1"]
    When the ProductGrid renders
    Then "Café" MUST be displayed
    And "Café"'s card MUST display the modifier badge

  Scenario: Flag OFF preserves pre-modifier ProductGrid behavior
    Given the `modifier_groups_enabled` flag is OFF
    And the active menu is "Desayuno"
    And "Café" (menus: Desayuno) has effective modifier groups ["g1"]
    When the ProductGrid renders
    Then "Café" MUST be displayed with no modifier badge
    And clicking "Café" MUST add it directly to the cart