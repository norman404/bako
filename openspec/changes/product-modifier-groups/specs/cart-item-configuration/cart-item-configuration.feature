Feature: Cart Item Configuration

  Define the identity and behavior of cart items that carry selected modifier groups.
  A cart line is identified by a unique lineId and by a selectedModifiers collection.
  Two lines of the same product with different modifiers are separate cart lines; two
  lines of the same product with identical modifiers collapse into a single line with
  incremented quantity.

  @happy-path
  Scenario: Same product different modifiers yields separate lines
    Given a cart containing one line of "Capuchino" with "Extra hielo"
    When a second "Capuchino" is added with "Sin hielo"
    Then the cart has two distinct lines
    And each line has a unique lineId

  @happy-path
  Scenario: Same product no modifiers collapses
    Given a cart containing one line of "Espresso" with no modifiers
    When a second "Espresso" is added without modifiers
    Then the cart has one line with quantity = 2

  @happy-path
  Scenario: Identical modifiers collapse with quantity increment
    Given a cart line of "Capuchino" with "Extra hielo" at quantity 1
    When another "Capuchino" with "Extra hielo" is added
    Then the cart has one line with quantity = 2
    And selectedModifiers remains the same

  @edge-case
  Scenario: Different text values do not collapse
    Given a cart line of "Capuchino" with text "Sin azúcar"
    When another "Capuchino" with text "Poca azúcar" is added
    Then the cart has two separate lines

  @edge-case
  Scenario: Same option different text does not collapse
    Given a cart line of "Capuchino" with option "Normal" and text "para llevar"
    When another "Capuchino" with option "Normal" and text "para aquí" is added
    Then the cart has two separate lines

  @happy-path
  Scenario: Empty modifiers collapses by product
    Given a cart line of "Espresso" with empty selectedModifiers at quantity 1
    When another "Espresso" with empty selectedModifiers is added
    Then the cart has one line with quantity = 2

  @happy-path
  Scenario: Snapshot captures group and option names
    Given a product added to the cart with group "Nivel de hielo" and option "Extra"
    When the cart line is inspected
    Then selectedModifiers contains an entry with groupId, groupName = "Nivel de hielo", optionId, optionName = "Extra", priceDelta set to the option's surcharge

  @happy-path
  Scenario: Text group captures textValue only
    Given a product added to the cart with a text group "Comentarios" and typed text "Sin azúcar"
    When the cart line is inspected
    Then selectedModifiers contains an entry with groupId, groupName = "Comentarios", optionId = NULL, optionName = "", textValue = "Sin azúcar"

  @happy-path
  Scenario: Single-text group captures option and text
    Given a product added to the cart with a single_text group "Tamaño" selecting "Grande" and typing "para llevar"
    When the cart line is inspected
    Then selectedModifiers contains an entry with optionId of "Grande", optionName = "Grande", priceDelta = 1000, textValue = "para llevar"

  @edge-case
  Scenario: Snapshot survives option rename
    Given a cart line with snapshot optionName = "Extra hielo"
    When the admin renames the option in the modifier group to "Mucha hielo"
    Then the cart line's selectedModifiers.optionName remains "Extra hielo"

  @happy-path
  Scenario: Add item with modifiers generates lineId
    Given an empty cart
    When addItemToCart is called with product "Capuchino" and modifiers with groupId "g1" and optionId "o1"
    Then the cart has one line with a non-empty lineId
    And the line's selectedModifiers matches the provided modifiers

  @happy-path
  Scenario: Add item without modifiers uses legacy identity
    Given an empty cart
    When addItemToCart is called with product "Espresso" and no modifiers
    Then the cart has one line
    And adding the same product again collapses by product.id

  @happy-path
  Scenario: Adding existing product-modifier combo increments quantity
    Given a cart with a line of "Capuchino" + "Extra hielo" at quantity 1
    When addItemToCart is called again with the same product and the same modifiers
    Then the existing line's quantity becomes 2
    And no new line is created

  @happy-path
  Scenario: Increment quantity by lineId
    Given a cart with a line whose lineId = "L1" and quantity = 1
    When incrementItemQuantity("L1") is invoked
    Then the line with lineId = "L1" has quantity = 2

  @happy-path
  Scenario: Decrement quantity by lineId
    Given a cart with a line whose lineId = "L1" and quantity = 2
    When decrementItemQuantity("L1") is invoked
    Then the line with lineId = "L1" has quantity = 1

  @happy-path
  Scenario: Remove line by lineId
    Given a cart with two lines lineId = "L1" and lineId = "L2"
    When removeItem("L1") is invoked
    Then only the line with lineId = "L2" remains

  @edge-case
  Scenario: Decrement to zero removes the line
    Given a cart with a line whose lineId = "L1" and quantity = 1
    When decrementItemQuantity("L1") is invoked
    Then the line with lineId = "L1" is removed from the cart

  @error
  Scenario: Operation on non-existent lineId is rejected
    Given a cart with no line whose lineId = "L9"
    When incrementItemQuantity("L9") is invoked
    Then the system rejects the operation with a not-found error
    And the cart state is unchanged

  @edge-case
  Scenario: Operation does not match by productId
    Given a cart with two lines of the same product "Capuchino" with lineId = "L1" and lineId = "L2"
    When incrementItemQuantity("L1") is invoked
    Then only the line with lineId = "L1" is incremented
    And the line with lineId = "L2" is unchanged

  @happy-path
  Scenario: Line subtotal includes surcharge
    Given a cart line with product price 5000, one selected modifier with priceDelta = 500, and quantity = 2
    When calculateCartTotals is invoked
    Then the line subtotal is 11000

  @happy-path
  Scenario: Multiple modifiers are summed per unit
    Given a cart line with product price 5000 and two selected modifiers with priceDelta = 500 and priceDelta = 800
    When calculateCartTotals is invoked
    Then the unit price is 6300

  @happy-path
  Scenario: Grand total sums all lines
    Given a cart with two lines: line A subtotal 11000, line B subtotal 5000
    When calculateCartTotals is invoked
    Then the grand total is 16000

  @edge-case
  Scenario: Text modifier with zero surcharge does not affect total
    Given a cart line with product price 5000 and a text modifier with priceDelta = 0
    When calculateCartTotals is invoked
    Then the line subtotal is 5000 * quantity

  @edge-case
  Scenario: Empty modifiers behaves like legacy total
    Given a cart line with product price 5000 and empty selectedModifiers at quantity 3
    When calculateCartTotals is invoked
    Then the line subtotal is 15000