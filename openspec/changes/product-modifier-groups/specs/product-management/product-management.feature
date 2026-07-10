Feature: Product Management
  Delta on product-management: products can have modifier groups assigned (own + inherited from category), and the admin grid surfaces a badge when effective modifier groups exist.

  # --- ADDED Requirements ---

  Scenario: Assign modifier group to a product
    Given a product "Café" with id "p1" and a modifier group "Nivel de hielo" with id "g1"
    When the product is assigned to the modifier group
    Then a row `(product_id: "p1", group_id: "g1")` EXISTS in `product_modifier_groups`
    And the domain `Product` for "p1" has `modifierGroupIds: ["g1"]`

  Scenario: Product assigned to zero modifier groups
    Given a product "Té" with id "p2" with no direct modifier group assignments
    When queried from persistence
    Then the domain `Product` has `modifierGroupIds: []`
    And no rows exist in `product_modifier_groups` for `product_id = "p2"`

  Scenario: Product assigned to multiple modifier groups
    Given a product "Café" with id "p1" assigned to groups "g1" and "g2"
    When queried from persistence
    Then the domain `Product` has `modifierGroupIds: ["g1", "g2"]`

  Scenario: Cascade delete on product removal
    Given a product "p1" assigned to modifier groups "g1", "g2"
    When the product is deleted
    Then ALL rows in `product_modifier_groups` WHERE `product_id = "p1"` MUST be deleted

  Scenario: Cascade delete on modifier group removal
    Given modifier group "g1" assigned to products "p1", "p2"
    When the modifier group "g1" is deleted
    Then ALL rows in `product_modifier_groups` WHERE `group_id = "g1"` MUST be deleted
    And products "p1" and "p2" remain in the `products` table

  Scenario: Effective groups merge category and product assignments
    Given category "c1" assigned to group "g1"
    And product "p1" in category "c1" assigned to group "g2"
    When listing products
    Then the effective modifier groups for "p1" MUST contain "g1" and "g2"

  Scenario: Dedup by group_id with product assignment winning
    Given category "c1" assigned to group "g1"
    And product "p1" in category "c1" also assigned to group "g1"
    When listing products
    Then the effective modifier groups for "p1" MUST contain exactly one entry for "g1"

  Scenario: Product with no category and no direct assignments
    Given a product "p2" with no category and no direct modifier group assignments
    When listing products
    Then the effective modifier groups for "p2" MUST be empty

  Scenario: Effective groups exclude archived modifier groups
    Given category "c1" assigned to group "g1" where "g1" is archived (deleted_at IS NOT NULL)
    And product "p1" in category "c1" with no direct assignments
    When listing products
    Then the effective modifier groups for "p1" MUST be empty

  Scenario: Badge shown on product with effective modifier groups
    Given a product "Café" with effective modifier groups ["g1", "g2"]
    When the admin ProductGrid renders the card for "Café"
    Then the card MUST display a visual badge indicating modifiers are present

  Scenario: Badge hidden on product without modifier groups
    Given a product "Té" with effective modifier groups `[]`
    When the admin ProductGrid renders the card for "Té"
    Then the card MUST NOT display any modifier badge

  # --- MODIFIED Requirements ---

  Scenario: Create product assigned to multiple menus and modifier groups
    Given a valid product input with name "Café con leche", categoryId "c1", price 500, menuIds ["m1", "m2"], modifierGroupIds ["g1", "g2"]
    When `createProduct` is called
    Then a new product is inserted into the `products` table
    And rows `(product_id, m1)` and `(product_id, m2)` are inserted into `product_menus`
    And rows `(product_id, g1)` and `(product_id, g2)` are inserted into `product_modifier_groups`

  Scenario: Create product with zero menus and zero modifier groups
    Given a valid product input with menuIds [] and modifierGroupIds []
    When `createProduct` is called
    Then a new product is inserted into `products`
    And NO rows are inserted into `product_menus`
    And NO rows are inserted into `product_modifier_groups`

  Scenario: Create product without modifierGroupIds (backward compatibility)
    Given a valid product input with menuIds ["m1"] and modifierGroupIds omitted
    When `createProduct` is called
    Then a new product is inserted into `products`
    And the resulting `Product.modifierGroupIds` MUST be []

  Scenario: Reject invalid menu IDs
    Given a product input with menuIds ["m99"] where "m99" does not exist
    When `createProduct` is called
    Then the system MUST return an error "Menu not found"

  Scenario: Reject invalid modifier group IDs
    Given a product input with modifierGroupIds ["g99"] where "g99" does not exist
    When `createProduct` is called
    Then the system MUST return an error "Modifier group not found"
    And no product or junction rows are created

  Scenario: Replace menu and modifier group assignments
    Given a product "p1" currently assigned to menus "m1", "m2" and modifier groups "g1"
    When `updateProduct(id: "p1", input: { menuIds: ["m2", "m3"], modifierGroupIds: ["g2"] })` is called
    Then all existing rows in `product_menus` for "p1" are deleted and replaced with (p1, m2), (p1, m3)
    And all existing rows in `product_modifier_groups` for "p1" are deleted and replaced with (p1, g2)

  Scenario: Update product without changing menu or modifier group assignments
    Given a product "p1" with menuIds ["m1"] and modifierGroupIds ["g1"]
    When `updateProduct(id: "p1", input: { name: "New Name" })` is called
    Then the product name is updated
    And menu assignments in `product_menus` remain unchanged
    And modifier group assignments in `product_modifier_groups` remain unchanged

  Scenario: Clear all menu assignments while preserving modifier groups
    Given a product "p1" assigned to menus "m1", "m2" and modifier groups "g1"
    When `updateProduct(id: "p1", input: { menuIds: [] })` is called
    Then all rows in `product_menus` for "p1" are deleted
    And rows in `product_modifier_groups` for "p1" remain unchanged

  Scenario: Clear all modifier group assignments while preserving menus
    Given a product "p1" assigned to menus "m1" and modifier groups "g1", "g2"
    When `updateProduct(id: "p1", input: { modifierGroupIds: [] })` is called
    Then all rows in `product_modifier_groups` for "p1" are deleted
    And rows in `product_menus` for "p1" remain unchanged

  Scenario: Reject update with non-existent modifier group
    Given a product "p1" with modifierGroupIds ["g1"]
    When `updateProduct(id: "p1", input: { modifierGroupIds: ["g99"] })` is called where "g99" does not exist
    Then the system MUST return an error "Modifier group not found"
    And existing `product_modifier_groups` rows for "p1" remain unchanged