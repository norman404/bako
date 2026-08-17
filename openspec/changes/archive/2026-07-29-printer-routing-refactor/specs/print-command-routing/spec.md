# Print Command Routing Specification

## Purpose

Reescribir `build-kitchen-commands.ts` para enrutar comandas por `category.printerId` en vez del broadcast actual a todas las impresoras con `role = KITCHEN`. Esta capability MODIFICA la existente cambiando el algoritmo de selección de destino y el agrupamiento de items.

## Requirements

### Requirement: buildKitchenCommands enruta por category.printerId

La función `buildKitchenCommands` recibe las categorías con su `printerId` y enruta cada item a la impresora asignada a su categoría. El filtrado por `role === KITCHEN` deja de ser el mecanismo de enrutado.

#### Scenario: buildKitchenCommands recibe categorías con printerId y enruta por categoría

- GIVEN una categoría `C` con `printerId = "p-1"` apuntando a la impresora `P1`
- AND una cart con un item `I` cuyo `product.categoryId` resuelve a `C`
- WHEN `buildKitchenCommands` se invoca con la cart, las impresoras y las categorías
- THEN el resultado contiene exactamente un comando dirigido a `P1`
- Y el comando incluye el item `I`

#### Scenario: Items de categorías sin impresora no generan command

- GIVEN una categoría `C` con `printerId = null`
- AND una cart con un item de `C`
- WHEN `buildKitchenCommands` se invoca
- THEN el resultado es un array vacío
- Y no se emiten comandos hacia ninguna impresora

#### Scenario: Items de categoría cuyo printerId no existe en la lista de impresoras se omiten

- GIVEN una categoría `C` con `printerId = "p-missing"` que no está en la lista de impresoras recibida
- AND una cart con un item de `C`
- WHEN `buildKitchenCommands` se invoca
- THEN el resultado es un array vacío (la impresora no existe, no se enruta)

### Requirement: Firma del builder recibe el mapeo categoría→impresora

La firma de `buildKitchenCommands` se actualiza para recibir las categorías (o el mapeo resuelto `categoryId → printerId`) además de la cart y las impresoras, de modo que pueda enrutar por categoría.

#### Scenario: Firma incluye categorías con printerId

- GIVEN la firma actual `buildKitchenCommands(cartLines, printers, headerText)`
- WHEN se actualiza para soportar enrutado por categoría
- THEN la nueva firma recibe además las categorías (o el mapeo `categoryId → printerId`)
- Y los callers (`use-print-commands.ts`) pasan las categorías con `printerId`

### Requirement: Comando print_command del backend intacto

El backend Rust `print_command` no se modifica. El shape de `PrintCommandOptions` (incluido `destination`) se preserva; solo cambia cómo se elige el `destination`.

#### Scenario: print_command recibe el mismo shape de PrintCommandOptions

- GIVEN el comando `print_command` del backend Rust (regresión)
- WHEN `buildKitchenCommands` emite comandos enrutados por categoría
- THEN cada comando conserva el shape `PrintCommandOptions` con `headerText`, `items`, y `destination`
- Y `destination` mantiene `printerType`, `printerAddress`, `labelWidthMm`, `labelHeightMm`, `labelGapMm`, `labelLanguage`
- Y el comando `print_command` procesa el payload sin cambios

### Requirement: Agrupamiento por impresora de destino

Los items que enrutan a la misma impresora se agrupan en un solo comando, sin duplicar comandas por unidad ni por categoría aislada.

#### Scenario: Items de varias categorías hacia la misma impresora se agrupan en un comando

- GIVEN categorías `C1` y `C2` ambas con `printerId = "p-1"`
- AND una cart con un item de `C1` y un item de `C2`
- WHEN `buildKitchenCommands` se invoca
- THEN el resultado contiene exactamente un comando dirigido a `P1`
- Y ese comando incluye ambos items en `items`

#### Scenario: No se duplica un comando por unidad de cantidad

- GIVEN una categoría `C` con `printerId = "p-1"`
- AND una cart con un item `I` con `quantity = 4` de `C`
- WHEN `buildKitchenCommands` se invoca
- THEN el resultado contiene exactamente un comando dirigido a `P1`
- Y ese comando contiene un único item con `quantity = 4` (no cuatro comandos de una unidad)
