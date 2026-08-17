# Category Printer Routing Specification

## Purpose

Enrutar las comandas de cocina según la impresora asignada a cada categoría, agrupando los items del carrito por `category.printerId` y emitiendo un solo comando de impresión por impresora asignada. Los items de categorías sin impresora asignada no generan comanda — no hay fallback.

## Requirements

### Requirement: Enrutado por impresora asignada a la categoría

Cada categoría enruta sus items a la impresora referenciada por `category.printerId`. El agrupamiento se hace por impresora de destino, no por unidad ni por categoría aislada.

#### Scenario: Categoría con impresora asignada enruta a esa impresora

- GIVEN una categoría `C` con `C.printerId = "p-1"` apuntando a la impresora `P1` (cualquier `role`)
- AND una cart con un item `I` cuyo `product.categoryId` resuelve a `C`
- WHEN `buildKitchenCommands` se invoca con la cart y el mapeo categoría→impresora
- THEN el resultado contiene exactamente un comando
- AND ese comando tiene `destination.printerAddress` igual a `P1.address`
- AND ese comando incluye el item `I` en `items`

#### Scenario: Categoría sin impresora asignada no genera comanda

- GIVEN una categoría `C` con `C.printerId = null`
- AND una cart con un item `I` cuyo `product.categoryId` resuelve a `C`
- WHEN `buildKitchenCommands` se invoca con la cart y el mapeo categoría→impresora
- THEN el resultado es un array vacío

#### Scenario: Múltiples categorías con distintas impresoras enrutan cada una a la suya

- GIVEN categorías `C1` con `printerId = "p-1"` y `C2` con `printerId = "p-2"` (impresoras distintas)
- AND una cart con un item de `C1` y un item de `C2`
- WHEN `buildKitchenCommands` se invoca
- THEN el resultado contiene exactamente dos comandos
- AND un comando tiene `destination.printerAddress` igual a la dirección de `P1` e incluye solo el item de `C1`
- AND el otro comando tiene `destination.printerAddress` igual a la dirección de `P2` e incluye solo el item de `C2`

#### Scenario: Múltiples categorías con la misma impresora se agrupan en una sola comanda

- GIVEN categorías `C1` y `C2` ambas con `printerId = "p-1"` (misma impresora `P1`)
- AND una cart con un item de `C1` y un item de `C2`
- WHEN `buildKitchenCommands` se invoca
- THEN el resultado contiene exactamente un comando
- AND ese comando tiene `destination.printerAddress` igual a `P1.address`
- AND ese comando incluye ambos items (el de `C1` y el de `C2`) en `items`

### Requirement: Agrupamiento por categoría, no por unidad

Los items se agrupan en una sola comanda por impresora de destino. Las unidades (cantidad) se expresan como `quantity` en el item, no como un comando separado por unidad.

#### Scenario: Items de la misma categoría se agrupan en una comanda, no una por unidad

- GIVEN una categoría `C` con `C.printerId = "p-1"`
- AND una cart con un item `I` con `quantity = 3` cuyo `product.categoryId` resuelve a `C`
- WHEN `buildKitchenCommands` se invoca
- THEN el resultado contiene exactamente un comando
- AND ese comando contiene un único item con `name` igual a `I.product.name` y `quantity` igual a `3`

#### Scenario: Cart vacía no genera comandas

- GIVEN una cart sin items
- WHEN `buildKitchenCommands` se invoca con cualquier mapeo categoría→impresora
- THEN el resultado es un array vacío

### Requirement: Sin fallback a impresoras kitchen por rol

El enrutado se basa exclusivamente en `category.printerId`. No se filtra ni se difunde a impresoras por `role === KITCHEN` cuando una categoría no tiene impresora asignada.

#### Scenario: Impresoras con role kitchen pero sin categoría asignada no reciben comanda

- GIVEN impresoras `K1` y `K2` ambas con `role = "kitchen"`
- AND una categoría `C` con `printerId = null`
- AND una cart con un item de `C`
- WHEN `buildKitchenCommands` se invoca con la cart, las impresoras y el mapeo categoría→impresora
- THEN el resultado es un array vacío
- AND ninguna comanda se dirige a `K1` ni a `K2`

#### Scenario: Categoría asignada a una impresora con role distinto a kitchen enruta igual

- GIVEN una categoría `C` con `printerId = "p-bar"` apuntando a una impresora con `role = "bar"`
- AND una cart con un item de `C`
- WHEN `buildKitchenCommands` se invoca
- THEN el resultado contiene exactamente un comando dirigido a la impresora `p-bar`
