# Printer Management Specification

## Purpose

Extender la entidad de dominio `Printer` y su gestión con el campo `isDefault` (booleano) que marca la impresora predeterminada para el ticket de venta, junto con la validación de que solo `role = "receipt"` puede ser default. Esta capability MODIFICA la existente añadiendo el flag y su regla de validación.

## Requirements

### Requirement: Campo isDefault en la entidad Printer

La entidad de dominio `Printer` incluye el campo booleano `isDefault`. El campo se persiste y carga correctamente desde el repositorio.

#### Scenario: Printer.isDefault se persiste y carga correctamente

- GIVEN una impresora `P` con `role = "receipt"` e `isDefault = true`
- WHEN se persiste `P` mediante `repository.create` o `repository.update`
- AND se recupera mediante `repository.findById(P.id)`
- THEN la impresora recuperada tiene `isDefault = true`
- AND el resto de campos coinciden con los persistidos

#### Scenario: Impresora sin isDefault carga como false

- GIVEN una impresora persistida cuyo `isDefault` no se especificó al crear
- WHEN se recupera mediante `repository.findById`
- THEN la impresora recuperada tiene `isDefault = false`

#### Scenario: Mapeo de isDefault en el repositorio drizzle

- GIVEN la columna `is_default` en la tabla `printers` (booleano, default `0`)
- WHEN el repositorio drizzle mapea una fila a la entidad `Printer`
- THEN el valor de la columna `is_default` se mapea al campo `isDefault` de la entidad
- Y el mapeo es bidireccional (entity → row y row → entity)

### Requirement: Validación de rol para isDefault

Solo las impresoras con `role = "receipt"` pueden tener `isDefault = true`. Cualquier intento de establecer `isDefault = true` en una impresora con otro rol se rechaza con un error de validación de dominio.

#### Scenario: isDefault = true con role != receipt produce error de validación

- GIVEN un input de creación o actualización con `role = "kitchen"` (o `"bar"` o `"other"`) e `isDefault = true`
- WHEN se ejecuta el use case `create-printer` o `update-printer`
- THEN la operación retorna un error de validación de dominio
- AND no se persiste ninguna impresora con `isDefault = true` para ese rol

#### Scenario: isDefault = false con cualquier rol es válido

- GIVEN un input con cualquier `role` e `isDefault = false`
- WHEN se ejecuta el use case `create-printer` o `update-printer`
- THEN la operación se completa exitosamente
- AND la impresora queda persistida con `isDefault = false`

### Requirement: Toggle de default en el panel de administración

El `PrinterSettingsPanel` expone un control "Predeterminada" visible únicamente para impresoras con `role = "receipt"`, que permite alternar el flag `isDefault`.

#### Scenario: Toggle Predeterminada visible solo para role = receipt

- GIVEN una impresora `P` con `role = "receipt"` cargada en el panel
- THEN el panel muestra el control "Predeterminada" para `P`
- AND dado una impresora `Q` con `role = "kitchen"` cargada en el panel
- THEN el panel NO muestra el control "Predeterminada" para `Q`

#### Scenario: Activar el toggle marca la impresora como default

- GIVEN una impresora `P` con `role = "receipt"` e `isDefault = false` cargada en el panel
- WHEN el usuario activa el toggle "Predeterminada"
- THEN se invoca la actualización con `isDefault = true`
- Y la unicidad del default se mantiene (ver capability `printer-default-receipt`)
