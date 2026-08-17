# Printer Specification

## Purpose

Define the lifecycle and management of thermal printers, label printers, kitchen command routing, and ticket printing for the POS system.

## Requirements

### Requirement: Printer Shared Factories

Proveer fixtures de dominio `Printer` reutilizables para los specs del proyecto, eliminando la duplicación actual donde cada spec reimplementa su propio `buildPrinter`. La factory sigue el patrón único del proyecto: `(overrides: Partial<T> = {}) => ({...defaults, ...overrides})`, dueño = módulo `printer`.

#### Scenario: buildPrinter genera un Printer válido con defaults

- GIVEN la factory `buildPrinter` importada desde `@/modules/printer/test/factories`
- WHEN se invoca `buildPrinter()` sin argumentos
- THEN retorna un objeto que satisface el tipo `Printer`
- AND todas las propiedades requeridas tienen valores por defecto coherentes (id, name, type, address, role, labelWidthMm, labelHeightMm, labelGapMm, labelLanguage, createdAt, updatedAt, deletedAt)
- AND el `id` es un string no vacío
- AND `deletedAt` es `null`

#### Scenario: buildPrinter permite sobreescribir campos específicos

- GIVEN la factory `buildPrinter`
- WHEN se invoca `buildPrinter({ role: "receipt", isDefault: true, name: "Caja 1" })`
- THEN retorna un `Printer` con `role = "receipt"`, `isDefault = true` y `name = "Caja 1"`
- AND los campos no sobreescritos conservan los valores por defecto

#### Scenario: buildPrinter permite sobreescribir campos anidados libremente

- GIVEN la factory `buildPrinter`
- WHEN se invoca `buildPrinter({ type: "network", address: "192.168.1.50:9100" })`
- THEN retorna un `Printer` con `type = "network"` y `address = "192.168.1.50:9100"`
- AND el resto de campos conservan los valores por defecto

#### Scenario: Factory importable por path directo desde otros specs

- GIVEN un spec en otro módulo (ej. `checkout`)
- WHEN se importa `import { buildPrinter } from "@/modules/printer/test/factories"`
- THEN la importación resuelve correctamente a la factory
- AND no requiere importar desde el barrel del módulo `printer`

#### Scenario: Otros specs dejan de duplicar buildPrinter

- GIVEN specs existentes que hoy definen su propia `buildPrinter` local
- WHEN adoptan la factory compartida
- THEN eliminan su implementación local de `buildPrinter`
- Y la factory compartida es la única fuente de construcción de fixtures `Printer`

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

### Requirement: Validación de rol para isDefault en use-cases

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
- Y la unicidad del default se mantiene

### Requirement: Labels del panel consumen keys i18n

Todos los textos visibles del `PrinterSettingsPanel` (títulos, labels de campos, botones, placeholders, estados vacíos, mensajes de confirmación) se obtienen vía la función de traducción i18n, sin strings literales hardcoded en español.

#### Scenario: Todos los labels del panel usan keys i18n

- GIVEN el componente `PrinterSettingsPanel.tsx` renderizado
- WHEN se inspecciona su código fuente
- THEN no existen strings literales en español para textos visibles
- AND cada texto visible se obtiene mediante la función de traducción i18n con una key de `settings.json`

#### Scenario: Las keys existen en los 5 locales

- GIVEN las keys i18n nuevas introducidas para el panel
- WHEN se ejecuta el guard `locale-completeness.spec.ts`
- THEN el test pasa porque las keys existen en `es-MX`, `en-US`, `es-AR`, `es-ES` y `pt-BR`
- Y cada locale tiene un valor traducido coherente para cada key

#### Scenario: Placeholders y estados vacíos también i18n-izados

- GIVEN el `PrinterSettingsPanel` mostrando un estado vacío (sin impresoras) o un placeholder de input
- WHEN se renderiza en cualquier locale
- THEN el texto del estado vacío y los placeholders provienen de keys i18n
- Y no hay strings hardcoded en ningún locale

#### Scenario: Toggle Predeterminada visible solo para role = receipt

- GIVEN una impresora `P` con `role = "receipt"` cargada en el panel
- THEN el panel muestra el toggle "Predeterminada" para `P`
- BUT dada una impresora `Q` con `role = "kitchen"` cargada en el panel
- THEN el panel NO muestra el toggle "Predeterminada" para `Q`

#### Scenario: El label del toggle Predeterminada usa key i18n

- GIVEN el toggle "Predeterminada" renderizado en el panel
- WHEN se inspecciona su label
- THEN el texto proviene de una key i18n (ej. `settings.printer.default`)
- Y no es un string literal hardcoded
- Y la key existe en los 5 locales con su traducción correspondiente

### Requirement: Errores de impresora i18n-izados

Los mensajes de error relacionados con impresoras (ej. validación, fallos de impresión) que se muestren desde el panel usan keys i18n, en `settings.json` o `errors.json` según corresponda.

#### Scenario: Mensajes de error de impresora usan keys i18n

- GIVEN un error de validación o de impresión mostrado desde el panel
- WHEN se renderiza el mensaje en cualquier locale
- THEN el texto proviene de una key i18n
- Y no es un string literal hardcoded
- Y la key existe en los 5 locales

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
