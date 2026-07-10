Feature: Order Checkout
  Delta on order-checkout: order items persist modifier snapshots, the order total includes modifier surcharges, the printed ticket shows selected options, and modifier persistence is gated by the `modifier_groups_enabled` feature flag.

  # --- ADDED Requirements ---

  Scenario: Input with single-option modifier
    Given an order item input for product "Café" with one selected modifier (group "Nivel de hielo", option "Extra", priceDelta 500)
    When the input is constructed
    Then `modifiers` MUST contain one entry with groupId, groupName, optionId, optionName "Extra", priceDelta 500, and textValue undefined

  Scenario: Input with text modifier
    Given an order item input for product "Café" with a free-text modifier (group "Comentarios", text "sin azúcar")
    When the input is constructed
    Then `modifiers` MUST contain one entry with textValue "sin azúcar", priceDelta 0, and optionId/optionName empty or null

  Scenario: Input with no modifiers
    Given an order item input for product "Té" with no modifier selections
    When the input is constructed
    Then `modifiers` MUST be an empty array []

  Scenario: Persist modifier snapshots on order creation
    Given a checkout order with one item "Café" having modifiers "Extra hielo" (+500) and "Comentarios: sin azúcar"
    When the order is created
    Then two rows MUST be inserted into `order_item_modifiers` referencing the order item id
    And the first row has option_name "Extra", price_delta 500, text_value NULL
    And the second row has option_name "", price_delta 0, text_value "sin azúcar"

  Scenario: Loaded order includes modifier snapshots
    Given an existing order with an item that has two modifier snapshots persisted
    When the order is loaded from persistence
    Then the returned `CheckoutOrderItem.modifiers` MUST contain two entries matching the persisted rows

  Scenario: Cascade delete on order item removal
    Given an order item with three modifier snapshots
    When the order item is deleted
    Then ALL rows in `order_item_modifiers` WHERE order_item_id matches MUST be deleted

  Scenario: Snapshots are immutable after persistence
    Given a modifier group "Nivel de hielo" whose option "Extra" is later renamed to "Doble"
    And an existing order whose snapshot has option_name "Extra"
    When the order is loaded after the rename
    Then the snapshot MUST still read option_name "Extra"

  Scenario: Total includes single modifier surcharge
    Given an order item with unitPrice 5000, quantity 2, and one modifier with priceDelta 500
    When `calculateOrderTotal` runs
    Then the line total MUST be (5000 + 500) * 2 = 11000
    And the order total MUST reflect this amount

  Scenario: Total includes multiple modifier surcharges
    Given an order item with unitPrice 5000, quantity 1, and modifiers with priceDelta 500 and priceDelta 300
    When `calculateOrderTotal` runs
    Then the line total MUST be (5000 + 500 + 300) * 1 = 5800

  Scenario: Total unchanged when no modifiers
    Given an order item with unitPrice 5000, quantity 3, and modifiers []
    When `calculateOrderTotal` runs
    Then the line total MUST be 5000 * 3 = 15000

  Scenario: Order total sums multiple items with and without surcharges
    Given item A with line total 11000 (with surcharge) and item B with line total 15000 (no surcharge)
    When `calculateOrderTotal` runs over both items
    Then the order total MUST be 26000

  Scenario: Builder propagates modifiers and computes unit price
    Given a cart item for product "Café" (price 5000) with selected modifiers "Extra hielo" (+500) and "Crema" (+300)
    When `buildOrderItemsInput` runs
    Then the produced `CheckoutOrderItemInput` has unitPrice 5800
    And `modifiers` contains two entries with priceDelta 500 and 300 respectively

  Scenario: Builder handles item without modifiers
    Given a cart item for product "Té" (price 4000) with no selected modifiers
    When `buildOrderItemsInput` runs
    Then the produced `CheckoutOrderItemInput` has unitPrice 4000
    And `modifiers` is an empty array

  Scenario: Builder ignores text modifiers price delta
    Given a cart item with a text-only modifier (priceDelta 0)
    When `buildOrderItemsInput` runs
    Then the `unitPrice` MUST not change due to the text modifier
    And `modifiers` MUST include the text entry with textValue set

  Scenario: Snapshots inserted alongside order items
    Given a checkout with two items, one having modifiers and one without
    When `createOrderItemRows` runs
    Then `createOrderItemModifiers` MUST be called for the item with modifiers
    And modifier rows MUST be inserted in the same transaction as the order item rows

  Scenario: No modifier rows when item has no modifiers
    Given a checkout with one item having modifiers []
    When `createOrderItemRows` runs
    Then no rows MUST be inserted into `order_item_modifiers`

  Scenario: Transaction rolls back modifiers on order item failure
    Given a checkout where order item insertion fails mid-transaction
    When the transaction rolls back
    Then no `order_item_modifiers` rows MUST remain for that order

  Scenario: Ticket lists options under item line
    Given a printed item "Café" with modifiers "Hielo: Extra" and "Comentarios: sin azúcar"
    When the ticket is rendered
    Then the item line reads "Café"
    And the next line reads "- Hielo: Extra"
    And the next line reads "- Comentarios: sin azúcar"

  Scenario: Ticket omits modifier section for plain item
    Given a printed item "Té" with modifiers []
    When the ticket is rendered
    Then the item line reads "Té"
    And no modifier sub-lines are rendered under it

  Scenario: Ticket uses textValue when option name is empty
    Given a printed item with a text modifier where optionName is empty and textValue "sin azúcar"
    When the ticket is rendered
    Then the sub-line reads "- Comentarios: sin azúcar"

  Scenario: Flag OFF discards modifiers at persistence
    Given a cart item with selected modifiers AND modifier_groups_enabled = false
    When the order is created
    Then no rows MUST be inserted into `order_item_modifiers`
    And the persisted `CheckoutOrderItem.unitPrice` MUST equal the product base price

  Scenario: Flag ON persists modifiers normally
    Given a cart item with selected modifiers AND modifier_groups_enabled = true
    When the order is created
    Then modifier snapshots MUST be inserted into `order_item_modifiers`
    And the persisted `CheckoutOrderItem.unitPrice` MUST include surcharges

  Scenario: Pre-modifier historical orders remain readable
    Given an order created before the modifier groups feature with no `order_item_modifiers` rows
    When the order is loaded with modifier_groups_enabled = false
    Then the order MUST load successfully
    And `CheckoutOrderItem.modifiers` MUST be an empty array

  # --- MODIFIED Requirements ---

  Scenario: Total sums unit price times quantity for plain items
    Given two items with (unitPrice 5000, quantity 2) and (unitPrice 3000, quantity 1) and no modifiers
    When `calculateOrderTotal` runs
    Then the order total MUST be 5000*2 + 3000*1 = 13000

  Scenario: Total includes modifier surcharges per item
    Given an item with unitPrice 5000, quantity 2, and modifiers summing priceDelta 800
    When `calculateOrderTotal` runs
    Then the line total MUST be (5000 + 800) * 2 = 11600

  Scenario: Total is zero for empty item list
    Given an empty items array
    When `calculateOrderTotal` runs
    Then the order total MUST be 0