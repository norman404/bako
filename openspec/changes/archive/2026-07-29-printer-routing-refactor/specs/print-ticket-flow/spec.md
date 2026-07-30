# Print Ticket Flow Specification

## Purpose

Desacoplar el adapter `print-ticket.adapter.ts` del store de settings, de modo que `printOrder()` reciba la impresora default receipt por parámetro en vez de leer `useSettingsStore`. Esta capability MODIFICA la existente sustituyendo la fuente de configuración de impresora.

## Requirements

### Requirement: printOrder recibe la impresora default receipt por parámetro

La función `printOrder` no lee el store de settings. Recibe explícitamente la impresora default receipt (o su ausencia) y la usa para construir el payload dirigido al backend.

#### Scenario: printOrder recibe la impresora default receipt por parámetro

- GIVEN una impresora `R` con `role = "receipt"`, `isDefault = true`, `type = "usb"`, `address = "USB:1234"`
- AND un input `PrintOrderOptions` válido
- WHEN se invoca `printOrder(input, R)`
- THEN el payload enviado a `invoke("print_ticket", ...)` tiene `printerType = "usb"` y `printerAddress = "USB:1234"`
- AND el payload incluye el resto de campos del ticket (ticketNumber, items, total, paymentMethod, etc.)

#### Scenario: printOrder sin default receipt printer no imprime

- GIVEN que no existe impresora default receipt (valor `null` o `undefined`)
- AND un input `PrintOrderOptions` válido
- WHEN se invoca `printOrder(input, null)`
- THEN la función retorna `okAsync(undefined)` sin invocar `print_ticket`
- AND el comando `print_ticket` del backend no se invoca

### Requirement: Soporte de impresora network para el ticket

Cuando la impresora default receipt es de tipo `network`, `printOrder` usa su dirección de red para construir el payload.

#### Scenario: Impresora default receipt con type = network usa network address

- GIVEN una impresora `R` con `role = "receipt"`, `isDefault = true`, `type = "network"`, `address = "192.168.1.50:9100"`
- AND un input `PrintOrderOptions` válido
- WHEN se invoca `printOrder(input, R)`
- THEN el payload tiene `printerType = "network"` y `printerAddress = "192.168.1.50:9100"`

#### Scenario: Impresora default receipt con type = label no imprime el ticket

- GIVEN una impresora `R` con `role = "receipt"`, `isDefault = true`, `type = "label"`
- AND un input `PrintOrderOptions` válido
- WHEN se invoca `printOrder(input, R)`
- THEN la función no genera bytes de ticket ESC/POS (el ticket es para impresoras usb/network)
- Y el comportamiento se documenta como no aplicable para impresoras label

### Requirement: Desacoplamiento del store de settings

El adapter `print-ticket.adapter.ts` no importa ni lee `useSettingsStore`. La configuración de impresora se inyecta desde el orquestador (`App.tsx`).

#### Scenario: El adapter NO importa useSettingsStore

- GIVEN el módulo `src/modules/checkout/adapters/print-ticket.adapter.ts`
- WHEN se inspecciona su contenido
- THEN no existe import de `useSettingsStore` ni de `@/modules/settings/store/settings-store`
- AND la función `printOrder` no referencia `useSettingsStore.getState()`

#### Scenario: App.tsx obtiene e inyecta la impresora default receipt

- GIVEN `App.tsx` orquestando el flujo de impresión al confirmar el checkout
- WHEN se confirma un checkout que requiere ticket
- THEN `App.tsx` obtiene la impresora default receipt desde el repositorio
- AND la pasa como parámetro a `printOrder`
- AND el adapter no la busca por su cuenta

### Requirement: Comando print_ticket del backend intacto

El backend Rust `print_ticket` no se modifica. Sigue recibiendo `printerType`/`printerAddress` en el payload, ahora provenientes de la fila `printers` en vez de `system_settings`.

#### Scenario: print_ticket recibe el mismo shape de payload

- GIVEN el comando `print_ticket` del backend Rust (regresión)
- WHEN `printOrder` construye el payload con la impresora default receipt
- THEN el shape del payload (`PrintTicketPayload`) es idéntico al anterior
- AND el comando `print_ticket` procesa el payload sin cambios
