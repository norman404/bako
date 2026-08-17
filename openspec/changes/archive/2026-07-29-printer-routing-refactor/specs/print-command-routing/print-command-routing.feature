Feature: Print Command Routing

  Reescribe build-kitchen-commands.ts para enrutar comandas por
  category.printerId en vez del broadcast actual a todas las
  impresoras con role=KITCHEN. Modifica la capability existente
  cambiando el algoritmo de selección de destino y el agrupamiento
  de items, preservando el shape de PrintCommandOptions.

  @routing @happy-path
  Scenario: buildKitchenCommands recibe categorías con printerId y enruta por categoría
    Given una categoría C con printerId = "p-1" apuntando a la impresora P1
    And una cart con un item I cuyo product.categoryId resuelve a C
    When buildKitchenCommands se invoca con la cart, las impresoras y las categorías
    Then el resultado contiene exactamente un comando dirigido a P1
    Y el comando incluye el item I

  @no-fallback
  Scenario: Items de categorías sin impresora no generan command
    Given una categoría C con printerId = null
    And una cart con un item de C
    When buildKitchenCommands se invoca
    Then el resultado es un array vacío
    Y no se emiten comandos hacia ninguna impresora

  @no-fallback
  Scenario: Items de categoría cuyo printerId no existe en la lista de impresoras se omiten
    Given una categoría C con printerId = "p-missing" no presente en la lista de impresoras
    And una cart con un item de C
    When buildKitchenCommands se invoca
    Then el resultado es un array vacío

  @signature
  Scenario: Firma incluye categorías con printerId
    Given la firma actual buildKitchenCommands(cartLines, printers, headerText)
    When se actualiza para soportar enrutado por categoría
    Then la nueva firma recibe además las categorías (o el mapeo categoryId → printerId)
    Y los callers pasan las categorías con printerId

  @regression @backend
  Scenario: print_command recibe el mismo shape de PrintCommandOptions
    Given el comando print_command del backend Rust
    When buildKitchenCommands emite comandos enrutados por categoría
    Then cada comando conserva el shape PrintCommandOptions con headerText, items y destination
    And destination mantiene printerType, printerAddress y los campos label
    Y el comando print_command procesa el payload sin cambios

  @grouping
  Scenario: Items de varias categorías hacia la misma impresora se agrupan en un comando
    Given categorías C1 y C2 ambas con printerId = "p-1"
    And una cart con un item de C1 y un item de C2
    When buildKitchenCommands se invoca
    Then el resultado contiene exactamente un comando dirigido a P1
    Y ese comando incluye ambos items en items

  @grouping
  Scenario: No se duplica un comando por unidad de cantidad
    Given una categoría C con printerId = "p-1"
    And una cart con un item I con quantity = 4 de C
    When buildKitchenCommands se invoca
    Then el resultado contiene exactamente un comando dirigido a P1
    Y ese comando contiene un único item con quantity = 4
