Feature: Category Printer Routing

  Las comandas de cocina se enrutan según la impresora asignada a cada
  categoría (category.printerId), agrupando los items por impresora de
  destino. Los items de categorías sin impresora no generan comanda —
  no hay fallback a impresoras kitchen por rol.

  @happy-path
  Scenario: Categoría con impresora asignada enruta a esa impresora
    Given una categoría C con C.printerId = "p-1" apuntando a la impresora P1
    And una cart con un item I cuyo product.categoryId resuelve a C
    When buildKitchenCommands se invoca con la cart y el mapeo categoría→impresora
    Then el resultado contiene exactamente un comando
    And ese comando tiene destination.printerAddress igual a P1.address
    And ese comando incluye el item I en items

  @no-fallback
  Scenario: Categoría sin impresora asignada no genera comanda
    Given una categoría C con C.printerId = null
    And una cart con un item I cuyo product.categoryId resuelve a C
    When buildKitchenCommands se invoca con la cart y el mapeo categoría→impresora
    Then el resultado es un array vacío

  @multi-destination
  Scenario: Múltiples categorías con distintas impresoras enrutan cada una a la suya
    Given categorías C1 con printerId = "p-1" y C2 con printerId = "p-2"
    And una cart con un item de C1 y un item de C2
    When buildKitchenCommands se invoca
    Then el resultado contiene exactamente dos comandos
    And un comando dirige a P1 e incluye solo el item de C1
    And el otro comando dirige a P2 e incluye solo el item de C2

  @grouping
  Scenario: Múltiples categorías con la misma impresora se agrupan en una sola comanda
    Given categorías C1 y C2 ambas con printerId = "p-1"
    And una cart con un item de C1 y un item de C2
    When buildKitchenCommands se invoca
    Then el resultado contiene exactamente un comando
    And ese comando dirige a P1.address e incluye ambos items

  @grouping
  Scenario: Items de la misma categoría se agrupan en una comanda, no una por unidad
    Given una categoría C con C.printerId = "p-1"
    And una cart con un item I con quantity = 3 cuyo product.categoryId resuelve a C
    When buildKitchenCommands se invoca
    Then el resultado contiene exactamente un comando
    And ese comando contiene un único item con name = I.product.name y quantity = 3

  @edge-case
  Scenario: Cart vacía no genera comandas
    Given una cart sin items
    When buildKitchenCommands se invoca
    Then el resultado es un array vacío

  @no-fallback
  Scenario: Impresoras con role kitchen pero sin categoría asignada no reciben comanda
    Given impresoras K1 y K2 ambas con role = "kitchen"
    And una categoría C con printerId = null
    And una cart con un item de C
    When buildKitchenCommands se invoca
    Then el resultado es un array vacío
    And ninguna comanda se dirige a K1 ni a K2

  @role-agnostic
  Scenario: Categoría asignada a una impresora con role distinto a kitchen enruta igual
    Given una categoría C con printerId = "p-bar" apuntando a una impresora con role = "bar"
    And una cart con un item de C
    When buildKitchenCommands se invoca
    Then el resultado contiene exactamente un comando dirigido a la impresora p-bar
