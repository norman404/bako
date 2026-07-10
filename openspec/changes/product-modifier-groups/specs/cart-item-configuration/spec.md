# Cart Item Configuration Specification

## Purpose

Define the identity and behavior of cart items that carry selected modifier groups. A cart line is identified by a unique `lineId` and by a `selectedModifiers` collection. Two lines of the same product with different modifiers are separate cart lines; two lines of the same product with identical modifiers collapse into a single line with incremented quantity.

## Requirements

### Requirement: Cart Item Identity

Each `CartItem` MUST have a `lineId: string` that uniquely identifies the line within the cart, plus a `selectedModifiers: SelectedModifier[]` collection capturing the user's choices. Two cart lines with the same `product.id` but different `selectedModifiers` MUST be treated as separate lines and MUST NOT collapse.

#### Scenario: Same product different modifiers yields separate lines

- GIVEN a cart containing one line of "Capuchino" with "Extra hielo"
- WHEN a second "Capuchino" is added with "Sin hielo"
- THEN the cart has two distinct lines
- AND each line has a unique `lineId`

#### Scenario: Same product no modifiers collapses

- GIVEN a cart containing one line of "Espresso" with no modifiers
- WHEN a second "Espresso" is added without modifiers
- THEN the cart has one line with `quantity = 2`

---

### Requirement: Modifier-Based Collapse

Two cart lines with the same `product.id` AND identical `selectedModifiers` MUST collapse into a single line with incremented `quantity`. Identity of `selectedModifiers` is defined by matching `groupId`, `optionId`, and `textValue` across every entry in both arrays.

#### Scenario: Identical modifiers collapse with quantity increment

- GIVEN a cart line of "Capuchino" with "Extra hielo" at quantity 1
- WHEN another "Capuchino" with "Extra hielo" is added
- THEN the cart has one line with `quantity = 2`
- AND `selectedModifiers` remains the same

#### Scenario: Different text values do not collapse

- GIVEN a cart line of "Capuchino" with text "Sin azúcar"
- WHEN another "Capuchino" with text "Poca azúcar" is added
- THEN the cart has two separate lines

#### Scenario: Same option different text does not collapse

- GIVEN a cart line of "Capuchino" with option "Normal" and text "para llevar"
- WHEN another "Capuchino" with option "Normal" and text "para aquí" is added
- THEN the cart has two separate lines

#### Scenario: Empty modifiers collapses by product

- GIVEN a cart line of "Espresso" with empty `selectedModifiers` at quantity 1
- WHEN another "Espresso" with empty `selectedModifiers` is added
- THEN the cart has one line with `quantity = 2`

---

### Requirement: Selected Modifier Capture

Each `SelectedModifier` MUST capture `groupId`, `groupName` (snapshot), `optionId`, `optionName` (snapshot), `priceDelta` (in cents), and `textValue` (for text-type groups). Snapshots MUST be taken at selection time and MUST NOT be affected by later edits to the modifier group or option.

#### Scenario: Snapshot captures group and option names

- GIVEN a product added to the cart with group "Nivel de hielo" and option "Extra"
- WHEN the cart line is inspected
- THEN `selectedModifiers` contains an entry with `groupId`, `groupName = "Nivel de hielo"`, `optionId`, `optionName = "Extra"`, `priceDelta` set to the option's surcharge

#### Scenario: Text group captures textValue only

- GIVEN a product added to the cart with a `text` group "Comentarios" and typed text "Sin azúcar"
- WHEN the cart line is inspected
- THEN `selectedModifiers` contains an entry with `groupId`, `groupName = "Comentarios"`, `optionId = NULL`, `optionName = ""`, `textValue = "Sin azúcar"`

#### Scenario: Single-text group captures option and text

- GIVEN a product added to the cart with a `single_text` group "Tamaño" selecting "Grande" and typing "para llevar"
- WHEN the cart line is inspected
- THEN `selectedModifiers` contains an entry with `optionId` of "Grande", `optionName = "Grande"`, `priceDelta = 1000`, `textValue = "para llevar"`

#### Scenario: Snapshot survives option rename

- GIVEN a cart line with snapshot `optionName = "Extra hielo"`
- WHEN the admin renames the option in the modifier group to "Mucha hielo"
- THEN the cart line's `selectedModifiers.optionName` remains "Extra hielo"

---

### Requirement: Add Item to Cart with Modifiers

`addItemToCart(product, modifiers?)` MUST accept an optional `modifiers` argument and MUST generate a unique `lineId` for the new line. When `modifiers` is empty or undefined, the function MUST behave like the legacy flow (identity = `product.id`, collapses by product).

#### Scenario: Add item with modifiers generates lineId

- GIVEN an empty cart
- WHEN `addItemToCart` is called with product "Capuchino" and modifiers `[{ groupId: "g1", optionId: "o1" }]`
- THEN the cart has one line with a non-empty `lineId`
- AND the line's `selectedModifiers` matches the provided modifiers

#### Scenario: Add item without modifiers uses legacy identity

- GIVEN an empty cart
- WHEN `addItemToCart` is called with product "Espresso" and no modifiers
- THEN the cart has one line
- AND adding the same product again collapses by `product.id`

#### Scenario: Adding existing product-modifier combo increments quantity

- GIVEN a cart with a line of "Capuchino" + "Extra hielo" at quantity 1
- WHEN `addItemToCart` is called again with the same product and the same modifiers
- THEN the existing line's `quantity` becomes 2
- AND no new line is created

---

### Requirement: Line-Based Cart Operations

`incrementItemQuantity(lineId)`, `decrementItemQuantity(lineId)`, and `removeItem(lineId)` MUST operate by `lineId` and MUST NOT match by `product.id`. Operations targeting a non-existent `lineId` MUST be rejected.

#### Scenario: Increment quantity by lineId

- GIVEN a cart with a line whose `lineId = "L1"` and `quantity = 1`
- WHEN `incrementItemQuantity("L1")` is invoked
- THEN the line with `lineId = "L1"` has `quantity = 2`

#### Scenario: Decrement quantity by lineId

- GIVEN a cart with a line whose `lineId = "L1"` and `quantity = 2`
- WHEN `decrementItemQuantity("L1")` is invoked
- THEN the line with `lineId = "L1"` has `quantity = 1`

#### Scenario: Remove line by lineId

- GIVEN a cart with two lines `lineId = "L1"` and `lineId = "L2"`
- WHEN `removeItem("L1")` is invoked
- THEN only the line with `lineId = "L2"` remains

#### Scenario: Decrement to zero removes the line

- GIVEN a cart with a line whose `lineId = "L1"` and `quantity = 1`
- WHEN `decrementItemQuantity("L1")` is invoked
- THEN the line with `lineId = "L1"` is removed from the cart

#### Scenario: Operation on non-existent lineId is rejected

- GIVEN a cart with no line whose `lineId = "L9"`
- WHEN `incrementItemQuantity("L9")` is invoked
- THEN the system rejects the operation with a not-found error
- AND the cart state is unchanged

#### Scenario: Operation does not match by productId

- GIVEN a cart with two lines of the same product "Capuchino" with `lineId = "L1"` and `lineId = "L2"`
- WHEN `incrementItemQuantity("L1")` is invoked
- THEN only the line with `lineId = "L1"` is incremented
- AND the line with `lineId = "L2"` is unchanged

---

### Requirement: Cart Totals Include Surcharges

`calculateCartTotals` MUST compute each line's subtotal as `(product.price + sum(selectedModifiers.priceDelta)) * quantity`. The cart grand total MUST be the sum of all line subtotals. Lines with no modifiers MUST compute as `product.price * quantity`.

#### Scenario: Line subtotal includes surcharge

- GIVEN a cart line with product price 5000, one selected modifier with `priceDelta = 500`, and `quantity = 2`
- WHEN `calculateCartTotals` is invoked
- THEN the line subtotal is 11000

#### Scenario: Multiple modifiers are summed per unit

- GIVEN a cart line with product price 5000 and two selected modifiers with `priceDelta = 500` and `priceDelta = 800`
- WHEN `calculateCartTotals` is invoked
- THEN the unit price is 6300

#### Scenario: Grand total sums all lines

- GIVEN a cart with two lines: line A subtotal 11000, line B subtotal 5000
- WHEN `calculateCartTotals` is invoked
- THEN the grand total is 16000

#### Scenario: Text modifier with zero surcharge does not affect total

- GIVEN a cart line with product price 5000 and a text modifier with `priceDelta = 0`
- WHEN `calculateCartTotals` is invoked
- THEN the line subtotal is `5000 * quantity`

#### Scenario: Empty modifiers behaves like legacy total

- GIVEN a cart line with product price 5000 and empty `selectedModifiers` at quantity 3
- WHEN `calculateCartTotals` is invoked
- THEN the line subtotal is 15000