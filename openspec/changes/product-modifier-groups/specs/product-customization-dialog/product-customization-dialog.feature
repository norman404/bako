Feature: Product Customization Dialog

  Define the UI dialog that appears when a user clicks a product to add it to the cart.
  The dialog surfaces the effective modifier groups of the product, lets the user pick
  options or enter text, enforces per-group selection rules, shows a running price
  calculation including surcharges, and gates the "Add to cart" action on required
  groups being satisfied.

  @happy-path
  Scenario: Dialog appears for product with effective groups
    Given modifier_groups_enabled = true
    And product "Capuchino" has effective groups "Nivel de hielo", "Leche alternativa"
    When the user clicks "Capuchino" in the product grid
    Then the customization dialog appears showing both groups

  @happy-path
  Scenario: Dialog does not appear for product without groups
    Given modifier_groups_enabled = true
    And product "Espresso" has no effective modifier groups
    When the user clicks "Espresso" in the product grid
    Then no dialog appears
    And "Espresso" is added directly to the cart

  @edge-case
  Scenario: Dialog never appears when flag is off
    Given modifier_groups_enabled = false
    And product "Capuchino" has effective groups
    When the user clicks "Capuchino" in the product grid
    Then no dialog appears
    And the product is added directly to the cart

  @happy-path
  Scenario: Pre-select default option in single group
    Given a single group "Nivel de hielo" with options "Sin hielo" (default), "Poco", "Normal", "Extra"
    When the dialog opens
    Then "Sin hielo" is pre-selected
    And the other options are selectable but not selected

  @happy-path
  Scenario: Change selection in single group
    Given a single group with "Sin hielo" pre-selected
    When the user selects "Extra"
    Then "Sin hielo" is deselected
    And "Extra" becomes the only selected option

  @edge-case
  Scenario: Single group with no default
    Given a single group whose options all have is_default = false
    When the dialog opens
    Then no option is pre-selected
    And the user may select any one option

  @happy-path
  Scenario: Pre-select multiple defaults
    Given a multiple group "Toppings" with "Extra queso" (default), "Cebolla caramelizada" (default), "Bacon"
    When the dialog opens
    Then both "Extra queso" and "Cebolla caramelizada" are pre-selected
    And "Bacon" is not selected

  @happy-path
  Scenario: Toggle additional option in multiple group
    Given a multiple group with two defaults pre-selected
    When the user checks "Bacon"
    Then "Bacon" becomes selected
    And the two defaults remain selected

  @happy-path
  Scenario: Unselect a default in multiple group
    Given a multiple group with "Extra queso" pre-selected
    When the user unchecks "Extra queso"
    Then "Extra queso" is no longer selected
    And no other selections are affected

  @happy-path
  Scenario: Text group shows textarea only
    Given a text group "Comentarios"
    When the dialog opens
    Then a textarea is rendered
    And no option list is shown for that group

  @happy-path
  Scenario: Text group preserves user input
    Given a text group with an empty textarea
    When the user types "Sin azúcar por favor"
    Then the textarea holds the typed value
    And the value is captured as textValue for that group

  @happy-path
  Scenario: Single-text group renders options and textarea
    Given a single_text group "Tamaño" with options "Normal" (default), "Grande (+$10)"
    When the dialog opens
    Then radio buttons for both options are rendered
    And a textarea for comments is rendered
    And "Normal" is pre-selected

  @happy-path
  Scenario: Capture option and text in single-text group
    Given a single_text group "Tamaño" with "Normal" pre-selected
    When the user selects "Grande" and types "para llevar"
    Then the captured selection has option "Grande" with textValue = "para llevar"

  @error
  Scenario: Required single group blocks add until selection
    Given a required single group "Nivel de hielo" with no default and no selection
    When the dialog is open
    Then the "Add to cart" button is disabled

  @happy-path
  Scenario: Required single group unblocks after selection
    Given a required single group with no selection (button disabled)
    When the user selects "Normal"
    Then the "Add to cart" button becomes enabled

  @error
  Scenario: Required text group blocks add until non-empty
    Given a required text group "Comentarios" with empty textarea
    When the dialog is open
    Then the "Add to cart" button is disabled

  @happy-path
  Scenario: Required text group unblocks after typing
    Given a required text group with empty textarea (button disabled)
    When the user types "Sin azúcar"
    Then the "Add to cart" button becomes enabled

  @happy-path
  Scenario: No required groups enables add immediately
    Given a product with only optional groups and defaults pre-selected
    When the dialog opens
    Then the "Add to cart" button is enabled immediately

  @error
  Scenario: Multiple required groups all must be satisfied
    Given a product with two required groups where only one is satisfied
    When the dialog is open
    Then the "Add to cart" button remains disabled
    And only the unsatisfied group is flagged as pending

  @happy-path
  Scenario: Initial price equals base plus default surcharges
    Given a product "Capuchino" with base price 5000 cents and a default option "Extra hielo" with priceDelta = 500
    When the dialog opens with defaults pre-selected
    Then the displayed price is 5500 cents

  @happy-path
  Scenario: Price updates on selection change
    Given a product with base price 5000 and an option "Bacon" with priceDelta = 800 currently not selected (displayed price 5000)
    When the user selects "Bacon"
    Then the displayed price becomes 5800

  @happy-path
  Scenario: Price decreases on unselect
    Given a product with base price 5000 and "Bacon" selected (displayed price 5800)
    When the user unselects "Bacon"
    Then the displayed price becomes 5000

  @edge-case
  Scenario: Text-only group does not affect price
    Given a product with base price 5000 and only a text group
    When the user types free text into the textarea
    Then the displayed price remains 5000

  @happy-path
  Scenario: Product without groups adds directly
    Given modifier_groups_enabled = true and product "Espresso" with no effective groups
    When the user clicks "Espresso"
    Then no dialog appears
    And "Espresso" is added to the cart with no selected modifiers

  @edge-case
  Scenario: Flag off preserves legacy flow
    Given modifier_groups_enabled = false
    When the user clicks any product
    Then no dialog appears regardless of the product's assignments
    And the product is added directly to the cart