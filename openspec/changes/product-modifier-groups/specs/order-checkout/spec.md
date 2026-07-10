# Delta for order-checkout

## ADDED Requirements

### Requirement: Order Item Modifiers in Input

The `CheckoutOrderItemInput` MUST include a `modifiers: CheckoutOrderItemModifierInput[]` field. Each `CheckoutOrderItemModifierInput` MUST capture `groupId`, `groupName`, `optionId`, `optionName`, `priceDelta` (in cents), and an optional `textValue` for free-text selections. The `modifiers` array MAY be empty (for products without modifier selections).

#### Scenario: Input with single-option modifier

- GIVEN an order item input for product "Café" with one selected modifier (group "Nivel de hielo", option "Extra", priceDelta 500)
- WHEN the input is constructed
- THEN `modifiers` MUST contain one entry with `groupId`, `groupName`, `optionId`, `optionName: "Extra"`, `priceDelta: 500`, and `textValue` undefined

#### Scenario: Input with text modifier

- GIVEN an order item input for product "Café" with a free-text modifier (group "Comentarios", text "sin azúcar")
- WHEN the input is constructed
- THEN `modifiers` MUST contain one entry with `textValue: "sin azúcar"`, `priceDelta: 0`, and `optionId`/`optionName` empty or null

#### Scenario: Input with no modifiers

- GIVEN an order item input for product "Té" with no modifier selections
- WHEN the input is constructed
- THEN `modifiers` MUST be an empty array `[]`

---

### Requirement: Persisted Order Item Modifier Snapshots

The system MUST persist each order item's modifiers as immutable snapshots in an `order_item_modifiers` table with columns `id` (TEXT PK), `order_item_id` (TEXT NOT NULL, CASCADE to `order_items(id)`), `group_id` (TEXT), `group_name` (TEXT NOT NULL), `option_id` (TEXT), `option_name` (TEXT NOT NULL), `price_delta` (INTEGER NOT NULL DEFAULT 0), `text_value` (TEXT), and `created_at` (INTEGER NOT NULL). The persisted `CheckoutOrderItem` entity MUST expose `modifiers: CheckoutOrderItemModifier[]` reflecting these snapshots.

#### Scenario: Persist modifier snapshots on order creation

- GIVEN a checkout order with one item "Café" having modifiers "Extra hielo" (+500) and "Comentarios: sin azúcar"
- WHEN the order is created
- THEN two rows MUST be inserted into `order_item_modifiers` referencing the order item id
- AND the first row has `option_name: "Extra"`, `price_delta: 500`, `text_value: NULL`
- AND the second row has `option_name: ""`, `price_delta: 0`, `text_value: "sin azúcar"`

#### Scenario: Loaded order includes modifier snapshots

- GIVEN an existing order with an item that has two modifier snapshots persisted
- WHEN the order is loaded from persistence
- THEN the returned `CheckoutOrderItem.modifiers` MUST contain two entries matching the persisted rows

#### Scenario: Cascade delete on order item removal

- GIVEN an order item with three modifier snapshots
- WHEN the order item is deleted
- THEN ALL rows in `order_item_modifiers` WHERE `order_item_id` matches MUST be deleted

#### Scenario: Snapshots are immutable after persistence

- GIVEN a modifier group "Nivel de hielo" whose option "Extra" is later renamed to "Doble"
- AND an existing order whose snapshot has `option_name: "Extra"`
- WHEN the order is loaded after the rename
- THEN the snapshot MUST still read `option_name: "Extra"`

---

### Requirement: Order Total with Modifier Surcharges

The `calculateOrderTotal` function MUST compute each item's line total as `(unitPrice + sum(modifier.priceDelta)) * quantity`, where `unitPrice` is the product's base price already including any surcharges baked into the input. The total MUST be the sum of all item line totals.

#### Scenario: Total includes single modifier surcharge

- GIVEN an order item with `unitPrice: 5000`, `quantity: 2`, and one modifier with `priceDelta: 500`
- WHEN `calculateOrderTotal` runs
- THEN the line total MUST be (5000 + 500) * 2 = 11000
- AND the order total MUST reflect this amount

#### Scenario: Total includes multiple modifier surcharges

- GIVEN an order item with `unitPrice: 5000`, `quantity: 1`, and modifiers with `priceDelta: 500` and `priceDelta: 300`
- WHEN `calculateOrderTotal` runs
- THEN the line total MUST be (5000 + 500 + 300) * 1 = 5800

#### Scenario: Total unchanged when no modifiers

- GIVEN an order item with `unitPrice: 5000`, `quantity: 3`, and `modifiers: []`
- WHEN `calculateOrderTotal` runs
- THEN the line total MUST be 5000 * 3 = 15000

#### Scenario: Order total sums multiple items with and without surcharges

- GIVEN item A with line total 11000 (with surcharge) and item B with line total 15000 (no surcharge)
- WHEN `calculateOrderTotal` runs over both items
- THEN the order total MUST be 26000

---

### Requirement: Build Order Items Input Propagates Modifiers

The `buildOrderItemsInput` builder MUST propagate each `CartItem`'s selected modifiers into the corresponding `CheckoutOrderItemInput.modifiers` array, and MUST compute `unitPrice` as the product base price plus the sum of all selected modifier `priceDelta` values for that item.

#### Scenario: Builder propagates modifiers and computes unit price

- GIVEN a cart item for product "Café" (price 5000) with selected modifiers "Extra hielo" (+500) and "Crema" (+300)
- WHEN `buildOrderItemsInput` runs
- THEN the produced `CheckoutOrderItemInput` has `unitPrice: 5800`
- AND `modifiers` contains two entries with `priceDelta` 500 and 300 respectively

#### Scenario: Builder handles item without modifiers

- GIVEN a cart item for product "Té" (price 4000) with no selected modifiers
- WHEN `buildOrderItemsInput` runs
- THEN the produced `CheckoutOrderItemInput` has `unitPrice: 4000`
- AND `modifiers` is an empty array

#### Scenario: Builder ignores text modifiers price delta

- GIVEN a cart item with a text-only modifier (priceDelta 0)
- WHEN `buildOrderItemsInput` runs
- THEN the `unitPrice` MUST not change due to the text modifier
- AND `modifiers` MUST include the text entry with `textValue` set

---

### Requirement: Create Order Item Modifier Rows

The `createOrderItemRows` persistence step MUST also call `createOrderItemModifiers` to persist the modifier snapshots for each created order item. Snapshot insertion MUST occur within the same transaction as the order item insertion.

#### Scenario: Snapshots inserted alongside order items

- GIVEN a checkout with two items, one having modifiers and one without
- WHEN `createOrderItemRows` runs
- THEN `createOrderItemModifiers` MUST be called for the item with modifiers
- AND modifier rows MUST be inserted in the same transaction as the order item rows

#### Scenario: No modifier rows when item has no modifiers

- GIVEN a checkout with one item having `modifiers: []`
- WHEN `createOrderItemRows` runs
- THEN no rows MUST be inserted into `order_item_modifiers`

#### Scenario: Transaction rolls back modifiers on order item failure

- GIVEN a checkout where order item insertion fails mid-transaction
- WHEN the transaction rolls back
- THEN no `order_item_modifiers` rows MUST remain for that order

---

### Requirement: Print Order Item Modifiers on Ticket

The `PrintOrderItem` type MUST include a `modifiers: PrintOrderItemModifier[]` field. The printed ticket MUST display, under each item line, the selected options grouped by modifier group, formatted as `- {groupName}: {optionName or textValue}`.

#### Scenario: Ticket lists options under item line

- GIVEN a printed item "Café" with modifiers "Hielo: Extra" and "Comentarios: sin azúcar"
- WHEN the ticket is rendered
- THEN the item line reads "Café"
- AND the next line reads "- Hielo: Extra"
- AND the next line reads "- Comentarios: sin azúcar"

#### Scenario: Ticket omits modifier section for plain item

- GIVEN a printed item "Té" with `modifiers: []`
- WHEN the ticket is rendered
- THEN the item line reads "Té"
- AND no modifier sub-lines are rendered under it

#### Scenario: Ticket uses textValue when option name is empty

- GIVEN a printed item with a text modifier where `optionName` is empty and `textValue: "sin azúcar"`
- WHEN the ticket is rendered
- THEN the sub-line reads "- Comentarios: sin azúcar"

---

### Requirement: Flag-Gated Modifier Persistence

If the `modifier_groups_enabled` feature flag is `false`, the checkout flow MUST NOT persist any `order_item_modifiers` rows, even when modifier data is present in the cart. In this state, `CheckoutOrderItemInput.modifiers` MUST be treated as empty and `unitPrice` MUST equal the product base price (no surcharges). Backward compatibility with pre-modifier orders MUST be preserved.

#### Scenario: Flag OFF discards modifiers at persistence

- GIVEN a cart item with selected modifiers AND `modifier_groups_enabled = false`
- WHEN the order is created
- THEN no rows MUST be inserted into `order_item_modifiers`
- AND the persisted `CheckoutOrderItem.unitPrice` MUST equal the product base price

#### Scenario: Flag ON persists modifiers normally

- GIVEN a cart item with selected modifiers AND `modifier_groups_enabled = true`
- WHEN the order is created
- THEN modifier snapshots MUST be inserted into `order_item_modifiers`
- AND the persisted `CheckoutOrderItem.unitPrice` MUST include surcharges

#### Scenario: Pre-modifier historical orders remain readable

- GIVEN an order created before the modifier groups feature with no `order_item_modifiers` rows
- WHEN the order is loaded with `modifier_groups_enabled = false`
- THEN the order MUST load successfully
- AND `CheckoutOrderItem.modifiers` MUST be an empty array

## MODIFIED Requirements

### Requirement: Calculate Order Total

The `calculateOrderTotal` function MUST compute the order total as the sum over all items of `(unitPrice + sum(modifier.priceDelta for that item)) * quantity`, where `unitPrice` is the per-item input price (already including surcharges baked in by the builder) and `modifiers` is the per-item modifier list. When an item has no modifiers, the line total MUST reduce to `unitPrice * quantity`.

(Previously: Total was the sum of `unitPrice * quantity` across items; no modifier surcharge concept existed.)

#### Scenario: Total sums unit price times quantity for plain items

- GIVEN two items with `(unitPrice: 5000, quantity: 2)` and `(unitPrice: 3000, quantity: 1)` and no modifiers
- WHEN `calculateOrderTotal` runs
- THEN the order total MUST be 5000*2 + 3000*1 = 13000

#### Scenario: Total includes modifier surcharges per item

- GIVEN an item with `unitPrice: 5000`, `quantity: 2`, and modifiers summing `priceDelta: 800`
- WHEN `calculateOrderTotal` runs
- THEN the line total MUST be (5000 + 800) * 2 = 11600

#### Scenario: Total is zero for empty item list

- GIVEN an empty items array
- WHEN `calculateOrderTotal` runs
- THEN the order total MUST be 0