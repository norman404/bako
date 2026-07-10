# Product Customization Dialog Specification

## Purpose

Define the UI dialog that appears when a user clicks a product to add it to the cart. The dialog surfaces the effective modifier groups of the product, lets the user pick options or enter text, enforces per-group selection rules, shows a running price calculation including surcharges, and gates the "Add to cart" action on required groups being satisfied.

## Requirements

### Requirement: Dialog Appearance Conditions

The customization dialog MUST appear when the product has at least one effective modifier group AND the `modifier_groups_enabled` flag is `true`. When the product has no effective modifier groups, the dialog MUST NOT appear and the product is added directly to the cart (backward compatibility). When `modifier_groups_enabled` is `false`, the dialog MUST NEVER appear regardless of assignments.

#### Scenario: Dialog appears for product with effective groups

- GIVEN `modifier_groups_enabled = true`
- AND product "Capuchino" has effective groups "Nivel de hielo", "Leche alternativa"
- WHEN the user clicks "Capuchino" in the product grid
- THEN the customization dialog appears showing both groups

#### Scenario: Dialog does not appear for product without groups

- GIVEN `modifier_groups_enabled = true`
- AND product "Espresso" has no effective modifier groups
- WHEN the user clicks "Espresso" in the product grid
- THEN no dialog appears
- AND "Espresso" is added directly to the cart

#### Scenario: Dialog never appears when flag is off

- GIVEN `modifier_groups_enabled = false`
- AND product "Capuchino" has effective groups
- WHEN the user clicks "Capuchino" in the product grid
- THEN no dialog appears
- AND the product is added directly to the cart

---

### Requirement: Single-Select Group Rendering

For modifier groups of `type = "single"`, the dialog MUST render options as radio buttons allowing at most one selection. The option flagged `is_default = true` MUST be pre-selected when the dialog opens.

#### Scenario: Pre-select default option in single group

- GIVEN a `single` group "Nivel de hielo" with options "Sin hielo" (default), "Poco", "Normal", "Extra"
- WHEN the dialog opens
- THEN "Sin hielo" is pre-selected
- AND the other options are selectable but not selected

#### Scenario: Change selection in single group

- GIVEN a `single` group with "Sin hielo" pre-selected
- WHEN the user selects "Extra"
- THEN "Sin hielo" is deselected
- AND "Extra" becomes the only selected option

#### Scenario: Single group with no default

- GIVEN a `single` group whose options all have `is_default = false`
- WHEN the dialog opens
- THEN no option is pre-selected
- AND the user MAY select any one option

---

### Requirement: Multiple-Select Group Rendering

For modifier groups of `type = "multiple"`, the dialog MUST render options as checkboxes allowing unlimited selections. Every option flagged `is_default = true` MUST be pre-selected when the dialog opens.

#### Scenario: Pre-select multiple defaults

- GIVEN a `multiple` group "Toppings" with "Extra queso" (default), "Cebolla caramelizada" (default), "Bacon"
- WHEN the dialog opens
- THEN both "Extra queso" and "Cebolla caramelizada" are pre-selected
- AND "Bacon" is not selected

#### Scenario: Toggle additional option in multiple group

- GIVEN a `multiple` group with two defaults pre-selected
- WHEN the user checks "Bacon"
- THEN "Bacon" becomes selected
- AND the two defaults remain selected

#### Scenario: Unselect a default in multiple group

- GIVEN a `multiple` group with "Extra queso" pre-selected
- WHEN the user unchecks "Extra queso"
- THEN "Extra queso" is no longer selected
- AND no other selections are affected

---

### Requirement: Text Group Rendering

For modifier groups of `type = "text"`, the dialog MUST render a single textarea input and MUST NOT render any options. The textarea captures free-text comments.

#### Scenario: Text group shows textarea only

- GIVEN a `text` group "Comentarios"
- WHEN the dialog opens
- THEN a textarea is rendered
- AND no option list is shown for that group

#### Scenario: Text group preserves user input

- GIVEN a `text` group with an empty textarea
- WHEN the user types "Sin azúcar por favor"
- THEN the textarea holds the typed value
- AND the value is captured as `textValue` for that group

---

### Requirement: Single-Text Group Rendering

For modifier groups of `type = "single_text"`, the dialog MUST render radio buttons for options AND a textarea for additional comments. Both the selected option and the text value are captured.

#### Scenario: Single-text group renders options and textarea

- GIVEN a `single_text` group "Tamaño" with options "Normal" (default), " Grande (+$10)"
- WHEN the dialog opens
- THEN radio buttons for both options are rendered
- AND a textarea for comments is rendered
- AND "Normal" is pre-selected

#### Scenario: Capture option and text in single-text group

- GIVEN a `single_text` group "Tamaño" with "Normal" pre-selected
- WHEN the user selects "Grande" and types "para llevar"
- THEN the captured selection has option "Grande" with `textValue = "para llevar"`

---

### Requirement: Required Group Validation

When a modifier group has `required = true`, the "Add to cart" button MUST be DISABLED until the group has a valid selection. For `single` and `single_text` groups, valid means at least one option selected. For `text` groups, valid means at least one non-whitespace character entered. When NO group is required, the "Add to cart" button MUST be ENABLED immediately with defaults pre-selected.

#### Scenario: Required single group blocks add until selection

- GIVEN a required `single` group "Nivel de hielo" with no default and no selection
- WHEN the dialog is open
- THEN the "Add to cart" button is disabled

#### Scenario: Required single group unblocks after selection

- GIVEN a required `single` group with no selection (button disabled)
- WHEN the user selects "Normal"
- THEN the "Add to cart" button becomes enabled

#### Scenario: Required text group blocks add until non-empty

- GIVEN a required `text` group "Comentarios" with empty textarea
- WHEN the dialog is open
- THEN the "Add to cart" button is disabled

#### Scenario: Required text group unblocks after typing

- GIVEN a required `text` group with empty textarea (button disabled)
- WHEN the user types "Sin azúcar"
- THEN the "Add to cart" button becomes enabled

#### Scenario: No required groups enables add immediately

- GIVEN a product with only optional groups and defaults pre-selected
- WHEN the dialog opens
- THEN the "Add to cart" button is enabled immediately

#### Scenario: Multiple required groups all must be satisfied

- GIVEN a product with two required groups where only one is satisfied
- WHEN the dialog is open
- THEN the "Add to cart" button remains disabled
- AND only the unsatisfied group is flagged as pending

---

### Requirement: Running Price Calculation

The dialog MUST display a running price equal to the product base price plus the sum of `priceDelta` for all currently selected options. The displayed price MUST update immediately when the user changes any selection.

#### Scenario: Initial price equals base plus default surcharges

- GIVEN a product "Capuchino" with base price 5000 cents and a default option "Extra hielo" with `priceDelta = 500`
- WHEN the dialog opens with defaults pre-selected
- THEN the displayed price is 5500 cents

#### Scenario: Price updates on selection change

- GIVEN a product with base price 5000 and an option "Bacon" with `priceDelta = 800` currently not selected (displayed price 5000)
- WHEN the user selects "Bacon"
- THEN the displayed price becomes 5800

#### Scenario: Price decreases on unselect

- GIVEN a product with base price 5000 and "Bacon" selected (displayed price 5800)
- WHEN the user unselects "Bacon"
- THEN the displayed price becomes 5000

#### Scenario: Text-only group does not affect price

- GIVEN a product with base price 5000 and only a `text` group
- WHEN the user types free text into the textarea
- THEN the displayed price remains 5000

---

### Requirement: Backward Compatibility Without Modifier Groups

When a product has no effective modifier groups, the dialog MUST NOT appear and the product is added directly to the cart with no modifiers, preserving the pre-existing flow.

#### Scenario: Product without groups adds directly

- GIVEN `modifier_groups_enabled = true` and product "Espresso" with no effective groups
- WHEN the user clicks "Espresso"
- THEN no dialog appears
- AND "Espresso" is added to the cart with no selected modifiers

#### Scenario: Flag off preserves legacy flow

- GIVEN `modifier_groups_enabled = false`
- WHEN the user clicks any product
- THEN no dialog appears regardless of the product's assignments
- AND the product is added directly to the cart