# Printer Default Receipt Specification

## Purpose

Garantizar que exista como máximo una impresora con `role = "receipt"` marcada como predeterminada para el ticket de venta, y que el invariant de unicidad se mantenga en persistencia mediante transacción al crear y actualizar.

## Requirements

### Requirement: Invariant de unicidad de impresora receipt default

En cualquier momento, a lo sumo una impresora con `role = "receipt"` puede tener `isDefault = true`. Cuando una impresora receipt se marca como default, cualquier otra impresora receipt previamente marcada como default debe quedar con `isDefault = false`.

#### Scenario: Marcar una receipt printer como default desmarca las demás receipt printers

- GIVEN dos impresoras `A` y `B` ambas con `role = "receipt"`
- AND `A.isDefault = true` y `B.isDefault = false`
- WHEN se actualiza `B` con `isDefault = true`
- THEN la impresora `A` queda persistida con `isDefault = false`
- AND la impresora `B` queda persistida con `isDefault = true`
- AND existe exactamente una impresora receipt con `isDefault = true` en el repositorio

#### Scenario: Al crear una receipt printer con isDefault = true desmarca las demás

- GIVEN una impresora `A` existente con `role = "receipt"` e `isDefault = true`
- WHEN se crea una nueva impresora `B` con `role = "receipt"` e `isDefault = true`
- THEN la impresora `A` queda persistida con `isDefault = false`
- AND la impresora `B` queda persistida con `isDefault = true`
- AND existe exactamente una impresora receipt con `isDefault = true`

#### Scenario: Marcar un segundo default en actualización no rompe invariant ante concurrencia

- GIVEN una impresora receipt `A` con `isDefault = true`
- WHEN la operación de marcar `B.isDefault = true` se ejecuta dentro de una transacción
- THEN la transacción desmarca `A` y marca `B` de forma atómica
- AND al finalizar no existen dos impresoras receipt con `isDefault = true` simultáneamente

### Requirement: Validación de rol para default

Solo las impresoras con `role = "receipt"` pueden tener `isDefault = true`. Cualquier intento de marcar como default una impresora con otro rol debe rechazarse con un error de dominio.

#### Scenario: No se puede marcar como default una printer con role distinto a receipt

- GIVEN una impresora `P` con `role = "kitchen"` (o `"bar"` o `"other"`)
- WHEN se intenta crear o actualizar `P` con `isDefault = true`
- THEN la operación falla con un error de validación de dominio
- AND `P` no queda persistida con `isDefault = true`

### Requirement: Ausencia de default receipt printer

Cuando ninguna impresora receipt está marcada como default, el flujo de impresión de ticket de venta no imprime.

#### Scenario: Sin receipt printer default el ticket no se imprime

- GIVEN ninguna impresora con `role = "receipt"` tiene `isDefault = true` (o no existen receipt printers)
- WHEN el flujo de impresión solicita la impresora default receipt
- THEN la respuesta indica que no hay impresora default receipt
- AND no se invoca el comando `print_ticket` del backend

### Requirement: La unicidad aplica solo al default receipt

El invariant de unicidad se aplica únicamente al conjunto de impresoras receipt con `isDefault = true`. Impresoras con otros roles ignoran el campo `isDefault` (siempre `false` o no aplicable).

#### Scenario: Múltiples impresoras kitchen pueden coexistir sin afectar el invariant

- GIVEN impresoras `K1` y `K2` ambas con `role = "kitchen"` (campo default no aplicable)
- AND una impresora `R1` con `role = "receipt"` e `isDefault = true`
- WHEN `K1` y `K2` se crean o actualizan sin `isDefault`
- THEN `R1` sigue siendo la única impresora con `isDefault = true`
- AND no se ve afectada por las operaciones sobre `K1` ni `K2`
