# Design: Perfiles de impresora + enrutamiento por categoría

## Overview

Bako tiene hoy dos modelos de impresora coexistiendo sin unificar. El **ticket de venta** lee `printer_type`/`printer_address` de `system_settings` (legacy single-printer) vía `useSettingsStore.getState()` dentro de `print-ticket.adapter.ts`. Las **comandas** usan la tabla `printers` con `role`, pero `build-kitchen-commands.ts` hace broadcast a TODAS las impresoras `role=kitchen` duplicando cada unidad, ignorando el campo `categories.printer_id` que ya existe en BD, en el schema Drizzle y en la UI (`CategorySettingsPanel.tsx`).

Este cambio conecta `categories.printer_id` al enrutamiento real de comandas (cada categoría enruta sus items a su impresora asignada, sin fallback), unifica el ticket de venta al modelo `printers` con un flag `is_default` (invariant de unicidad en transacción), i18n-iza `PrinterSettingsPanel.tsx` (hoy con labels hardcoded en español) y crea `printer/test/factories.ts` compartida.

**Enfoque arquitectónico:** preservar Clean Architecture por módulo. El dominio `printer` gana `isDefault` + validación de rol; la persistencia gana la transacción "solo un default"; el dominio `checkout` gana un `buildKitchenCommands` puro que recibe categorías; `printOrder` se vuelve puro (recibe la printer default por parámetro, deja de leer el store); `App.tsx` hace el wiring (obtiene default receipt printer + categorías con `printerId`). El backend Rust queda intacto — `print_ticket` sigue recibiendo `printerType`/`printerAddress`, ahora provenientes de la fila `printers`.

## Architecture Decisions

| # | Decision | Choice | Alternatives Rejected | Rationale |
|---|----------|--------|----------------------|-----------|
| 1 | Perfil de impresora | Reusar tabla `printers` con columna `is_default` (boolean, nullable-default `false`) | Tabla separada `printer_profiles`; entidad `ReceiptProfile` | Una columna nullable es más simple; `is_default` es propiedad de la impresora, no de una entidad aparte. Consistente con `menus.isDefault` y `modifierOptions.isDefault` ya existentes en el schema. |
| 2 | Invariant "solo un default" | Transacción en persistencia: desmarca la default anterior al marcar nueva | UNIQUE constraint parcial; trigger SQL; validación solo en use-case | La transacción garantiza consistencia a nivel BD sin depender del caller. SQLite no soporta UNIQUE parcial con `WHERE` en todos los builds; el trigger acopla lógica al schema. La transacción en el repo es testeable y explícita. |
| 3 | Restricción de rol default | Solo `role=receipt` puede ser `is_default=1` | Cualquier rol puede ser default | El ticket de venta es único y global; "default" significa "impresora de ticket". Validación en dominio (`PrinterValidationError`) + persistencia (defense in depth). |
| 4 | `buildKitchenCommands` rewrite | Recibe `categories: Category[]` además de `cartLines`/`printers`/`headerText`; agrupa items por `category.printerId`; sin fallback | Mapa `Record<categoryId, printerId>` desacoplado; mantener broadcast | Pasar `Category[]` es más simple para el caller (App.tsx ya las tiene de `useFilteredProducts`). `build-kitchen-commands.ts` ya importa `SelectedModifier` de `@/modules/menu/domain`, así que importar `Category` de `@/modules/menu/domain/category` es consistente. El builder construye el mapa interno. |
| 5 | `printOrder` puro | Recibe `defaultReceiptPrinter: Printer \| null` por parámetro; deja de leer `useSettingsStore` | Mantener lectura del store; hook wrapper | Desacopla el adapter del store (testable sin mockear Zustand). `null` → `okAsync(undefined)` (no imprime), mismo contrato que el `printerType === "none"` actual. |
| 6 | App.tsx wiring | `usePrinters({ enabled: receiptPrintingEnabled })` + deriva default con `.find(p => p.role === "receipt" && p.isDefault)`; pasa `categories` a `usePrintCommands` | Hook nuevo `useDefaultReceiptPrinter`; query dedicada | `usePrinters` ya usa `PRINTERS_QUERY_KEY = ["printers"]` cacheado por TanStack Query — llamarlo en App.tsx reusa el cache de `usePrintCommands`. Sin hook nuevo, menos superficie. |
| 7 | Migración idempotente | `0023` solo crea fila `printers` receipt-default si `NOT EXISTS` receipt default activa; columnas legacy se deprecian (no se borran) | Borrar columnas legacy; migración destructiva | Tauri detecta checksum de migraciones aplicadas — nunca modificar una anterior. `NOT EXISTS` preserva instalaciones existentes y no duplica en re-run. |
| 8 | Factories compartidas | `printer/test/factories.ts` con `buildPrinter` (dueño = módulo printer), importable por path directo | Factory por spec; barrel export | Elimina la duplicación actual de `buildPrinter` en cada spec. Patrón idéntico a `menu/test/factories.ts`. Import por path (`@/modules/printer/test/factories`), nunca vía barrel. |
| 9 | i18n en misma tanda | Keys nuevas en `settings.json` (`settings.printer.*`) + `errors.json` (`errors.printer.printerDefaultRoleInvalid`), propagadas a los 4 locales restantes | Hardcodear; namespace `printer.json` dedicado | El guard `locale-completeness.spec.ts` exige paridad en los 5 locales. Las keys de printer ya viven en `settings.json`/`errors.json` — mantener consistencia, no crear namespace nuevo. |
| 10 | `PrinterSettingsCard` legacy | Se depreca (no se elimina) — el ticket pasa a leer de `printers` | Eliminar; migrar su UI | Deprecar es reversible y no rompe; el `settingsStore.printerType/Address` queda como dead code hasta limpieza futura. |

## Data Model Changes

### Schema — antes

```sql
-- printers (estado actual, migración 0022)
printers {
  id, name, type, address, role,
  label_width_mm, label_height_mm, label_gap_mm, label_language,
  created_at, updated_at, deleted_at
}

-- system_settings (legacy, migración 0011)
system_settings {
  id, locale, currency,
  printer_type,        -- legacy: "usb"|"network"|"none"
  printer_address,     -- legacy
  comanda_header_text,
  updated_at
}

-- categories.printer_id ya existe (migración 0017) — sin cambios
categories { ..., printer_id REFERENCES printers(id) }
```

### Schema — después

```sql
-- printers (migración 0023)
printers {
  ...,
  is_default INTEGER NOT NULL DEFAULT 0  -- NUEVO
}

-- system_settings: printer_type/printer_address se DEPRECAN (no se borran)
```

Campo Drizzle en `src/shared/db/schema.ts`:

```ts
printers = sqliteTable("printers", {
  // ...existentes
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  // ...
});
```

Consistente con `menus.is_default` (schema.ts:6) y `modifier_options.is_default` (schema.ts:89) — mismo patrón `integer({ mode: "boolean" }).notNull().default(false)`.

### Invariant: solo un `is_default=1` con `role=receipt`

No se expresa como constraint SQL (SQLite no soporta UNIQUE parcial portable). Se garantiza en persistencia vía **transacción** (ver *Persistence Layer*). El dominio valida que `isDefault=true` implique `role=receipt`.

## Domain Changes

### `src/modules/printer/domain/printer.ts`

```ts
export interface Printer {
  id: string;
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
  isDefault: boolean;            // NUEVO
  labelWidthMm: number;
  labelHeightMm: number;
  labelGapMm: number;
  labelLanguage: LabelLanguage;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PrinterCreateInput {
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
  isDefault?: boolean;          // NUEVO
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelLanguage?: LabelLanguage;
}

export type PrinterUpdateInput = PrinterCreateInput;
```

### `src/modules/printer/domain/errors.ts`

Nuevo código de error:

```ts
export type PrinterErrorCode =
  | "printerNotFound"
  | "printerNameRequired"
  | "printerAddressRequired"
  | "printerTypeInvalid"
  | "printerRoleInvalid"
  | "printerLabelLanguageInvalid"
  | "printerDefaultRoleInvalid"   // NUEVO
  | "dbError";
```

### Reglas de validación (dominio + persistencia, defense in depth)

| Regla | Capa | Error |
|-------|------|-------|
| `isDefault === true` Y `role !== "receipt"` | use-case + persistence | `PrinterValidationError("printerDefaultRoleInvalid")` |
| `name.trim().length === 0` | use-case + persistence | `printerNameRequired` |
| `address.trim().length === 0` | use-case + persistence | `printerAddressRequired` |
| `type` ∉ `{usb, network, label}` | persistence | `printerTypeInvalid` |
| `role` ∉ `{receipt, kitchen, bar, other}` | persistence | `printerRoleInvalid` |

### Invariants

- **I1:** A lo sumo una fila `printers` con `role='receipt' AND is_default=1 AND deleted_at IS NULL`.
- **I2:** `is_default=1` implica `role='receipt'`.
- **I3:** Archivar la default receipt no promueve otra automáticamente — queda sin default hasta que el usuario marque una nueva. (Decisión: no auto-promover; `printOrder` recibe `null` y no imprime.)

## Persistence Layer

### `src/modules/printer/persistence/printer-drizzle.repository.ts`

#### Mapeo `rowToPrinter`

```ts
function rowToPrinter(row: PrinterRow): Printer {
  return {
    // ...existentes
    isDefault: row.isDefault ?? false,   // NUEVO
    // ...
  };
}
```

#### Validación de rol default (agregar a `validatePrinterInput`)

```ts
if (input.isDefault === true && input.role !== PRINTER_ROLE.RECEIPT) {
  return new PrinterValidationError("printerDefaultRoleInvalid");
}
```

#### Transacción "solo un default"

El invariant I1 se garantiza envolviendo el desmarcado + marcado en una transacción. Drizzle para SQLite soporta `db.batch([stmt1, stmt2])` (ejecución atómica secuencial). El `db` de `@/shared/db/client` viene de `@tauri-apps/plugin-sql` — la implementación debe verificar soporte de `batch`; si no está disponible, fallback a dos queries secuenciales dentro de un `db.transaction` (ver *Open Questions*).

**`create`** (cuando `input.isDefault === true`):

```ts
create(input) {
  // validación (incluye printerDefaultRoleInvalid)
  const stmts = [];
  if (input.isDefault === true) {
    // desmarcar la default anterior
    stmts.push(
      db.update(printers)
        .set({ isDefault: false })
        .where(and(eq(printers.role, "receipt"), eq(printers.isDefault, true), isNull(printers.deletedAt)))
    );
  }
  stmts.push(
    db.insert(printers).values({ ..., isDefault: input.isDefault ?? false, ... }).returning()
  );
  // db.batch(stmts) → tomar la fila insertada → rowToPrinter
}
```

**`update`** (cuando `input.isDefault === true`):

```ts
update(id, input) {
  // validación
  // loadActivePrinterById (existe)
  const stmts = [];
  if (input.isDefault === true) {
    // desmarcar la default anterior, excluyendo la que se edita
    stmts.push(
      db.update(printers)
        .set({ isDefault: false })
        .where(and(
          eq(printers.role, "receipt"),
          eq(printers.isDefault, true),
          isNull(printers.deletedAt),
          ne(printers.id, id),
        ))
    );
  }
  stmts.push(
    db.update(printers).set({ ..., isDefault: input.isDefault ?? false, ... })
      .where(and(eq(printers.id, id), isNull(printers.deletedAt)))
      .returning()
  );
  // db.batch(stmts) → tomar la fila actualizada → rowToPrinter
}
```

**`archive`**: sin cambios especiales. Si se archiva la default receipt, `is_default` queda en `1` en la fila soft-deleted (no afecta queries activas porque `deletedAt IS NULL` las filtra). No se auto-promueve otra (invariant I3).

### `src/modules/printer/domain/ports.ts`

`PrinterRepository` **no cambia** — la interfaz sigue siendo `{ list, findById, create, update, archive }`. El invariant vive dentro de `create`/`update`, no se expone como método separado. Si el hook necesita encontrar la default, deriva con `.find()` sobre `list()`.

## Use-Cases & Hooks

### Use-cases (`create-printer.ts`, `update-printer.ts`)

Los use-cases **ya validan** `name` y `address`. Se agrega la validación de rol-default (defense in depth antes del repo):

```ts
// create-printer.ts / update-printer.ts
function validatePrinterInput(input: PrinterCreateInput): PrinterDomainError | null {
  // ...existentes (name, address)
  if (input.isDefault === true && input.role !== PRINTER_ROLE.RECEIPT) {
    return new PrinterValidationError("printerDefaultRoleInvalid");
  }
  return null;
}

function normalizePrinterInput(input): PrinterCreateInput {
  return {
    name: input.name.trim(),
    type: input.type,
    address: input.address.trim(),
    role: input.role,
    isDefault: input.isDefault ?? false,   // NUEVO
    labelWidthMm: input.labelWidthMm,
    labelHeightMm: input.labelHeightMm,
    labelGapMm: input.labelGapMm,
    labelLanguage: input.labelLanguage,
  };
}
```

`listPrinters` y `archivePrinter`: sin cambios.

### Hooks (`src/modules/printer/hooks/use-printers.ts`)

`usePrinters`, `useCreatePrinter`, `useUpdatePrinter`, `useArchivePrinter`: **sin cambios de firma**. `PrinterCreateInput`/`PrinterUpdateInput` ya incluyen `isDefault?` (dominio), así que los mutations lo propagan automáticamente. Se mantiene el hardcoded `printerDrizzleRepository` (deuda conocida, fuera de scope).

El cache `PRINTERS_QUERY_KEY = ["printers"]` se invalida en cada mutation — App.tsx y `usePrintCommands` reusan el mismo cache.

## Checkout Flow Changes

### 1. `build-kitchen-commands.ts` — rewrite

**Firma actual:**
```ts
export interface CartLine {
  product: { id: string; name: string };
  quantity: number;
  selectedModifiers: SelectedModifier[];
}

export function buildKitchenCommands(
  cartLines: CartLine[],
  printers: Printer[],
  headerText: string,
): PrintCommandOptions[]
```

**Firma nueva:**
```ts
import type { Category } from "@/modules/menu/domain/category";

export interface CartLine {
  product: { id: string; name: string; categoryId: string | null };  // NUEVO: categoryId
  quantity: number;
  selectedModifiers: SelectedModifier[];
}

export function buildKitchenCommands(
  cartLines: CartLine[],
  printers: Printer[],
  categories: Category[],        // NUEVO
  headerText: string,
): PrintCommandOptions[]
```

**Lógica nueva:**

1. Construir mapa `categoryId → printerId` desde `categories` (filtrando `deletedAt === null`, solo las que tienen `printerId !== null`).
2. Indexar `printers` por `id` en un mapa `printerId → Printer` (para lookup O(1)).
3. Agrupar `cartLines` por `category.printerId`:
   - Si `line.product.categoryId === null` → la línea no se imprime (sin categoría, sin routing).
   - Si la categoría no está en el mapa → no se imprime (categoría sin impresora asignada).
   - Si `printerId` no está en el mapa de printers → no se imprime (impresora archivada/inválida).
4. Por cada grupo (impresora destino), emitir **un command por unidad** (manteniendo `quantity=1` por command — comportamiento actual probado):
   ```ts
   for (const [printerId, lines] of groupsByPrinter) {
     const printer = printerMap.get(printerId);
     if (!printer) continue;
     for (const line of lines) {
       for (let unit = 0; unit < line.quantity; unit++) {
         options.push({
           headerText,
           items: [{ name: line.product.name, quantity: 1, modifiers: toCommandModifiers(line) }],
           destination: {
             printerType: printer.type,
             printerAddress: printer.address,
             labelWidthMm: printer.labelWidthMm,
             labelHeightMm: printer.labelHeightMm,
             labelGapMm: printer.labelGapMm,
             labelLanguage: printer.labelLanguage,
           },
         });
       }
     }
   }
   ```

**Sin fallback.** Items de categorías sin impresora asignada no generan comanda. Esto es el cambio de comportamiento central — decisión resuelta en PRD.

**Nota:** el filtrado por `role === KITCHEN` desaparece. El routing se define por `category.printerId`, no por rol. Una impresora `role=bar` asignada a una categoría SÍ recibe sus comandas. Esto es correcto: el rol es metadata, el routing lo define la categoría.

### 2. `print-ticket.adapter.ts` — `printOrder` puro

**Firma actual:**
```ts
export function printOrder(input: PrintOrderOptions): ResultAsync<void, Error>
// lee useSettingsStore.getState() internamente
```

**Firma nueva:**
```ts
import type { Printer } from "@/modules/printer/domain/printer";

export function printOrder(
  input: PrintOrderOptions,
  defaultReceiptPrinter: Printer | null,
): ResultAsync<void, Error> {
  if (defaultReceiptPrinter === null) {
    return okAsync(undefined);   // no imprime
  }

  const payload = buildPayload(
    input,
    defaultReceiptPrinter.type,
    defaultReceiptPrinter.address,
  );

  const invokeAsync = async (): Promise<void> => {
    await invoke("print_ticket", { input: payload });
  };

  return ResultAsync.fromPromise(invokeAsync(), (error) => {
    if (error instanceof Error) return error;
    return new Error(String(error));
  });
}
```

- Desaparece el import de `useSettingsStore`.
- Desaparece el check `printerType === "none"` (era del store legacy; `PRINTER_TYPE` no incluye `"none"`).
- `testPrinter` en el mismo archivo: se mantiene leyendo del store por ahora (el `test_printer` del `PrinterSettingsPanel` ya no usa `testPrinter` del adapter — usa `testPrinter` de `test-printer.adapter.ts` con la printer del form). Se marca `testPrinter` del `print-ticket.adapter` como deprecated.

### 3. `use-print-commands.ts` — nueva interfaz

**Firma actual:**
```ts
export function usePrintCommands(options: { enabled?: boolean } = {})
// printCommands(cartItems: CartItem[]) — construye CartLine sin categoryId
```

**Firma nueva:**
```ts
import type { Category } from "@/modules/menu/domain/category";

export interface UsePrintCommandsOptions {
  enabled?: boolean;
  categories: Category[];   // NUEVO
}

export function usePrintCommands(options: UsePrintCommandsOptions) {
  const { enabled = true, categories } = options;
  const { data: printers = [] } = usePrinters({ enabled });
  const comandaHeaderText = useSettingsStore((state) => state.comandaHeaderText);
  const headerText = comandaHeaderText?.trim() || "COMANDA";

  return {
    printCommands: async (cartItems: CartItem[]) => {
      const commands = buildKitchenCommands(
        cartItems.map((item) => ({
          product: {
            id: item.product.id,
            name: item.product.name,
            categoryId: item.product.categoryId,   // NUEVO
          },
          quantity: item.quantity,
          selectedModifiers: item.selectedModifiers,
        })),
        printers,
        categories,        // NUEVO
        headerText,
      );

      const results = await Promise.all(commands.map((command) => printCommand(command)));
      return results.filter((r) => r.isErr()).map((r) => r.error);
    },
  };
}
```

### 4. `App.tsx` — wiring

Línea 146 actual:
```ts
const { printCommands } = usePrintCommands({ enabled: comandasEnabled });
```

Wiring nuevo:
```ts
import { usePrinters } from "@/modules/printer/hooks/use-printers";
import { PRINTER_ROLE } from "@/modules/printer/domain/printer";

// ...dentro de App()
const { data: printers = [] } = usePrinters({ enabled: receiptPrintingEnabled || comandasEnabled });
const defaultReceiptPrinter =
  printers.find((p) => p.role === PRINTER_ROLE.RECEIPT && p.isDefault) ?? null;

// useFilteredProducts ya retorna categories (línea 131) — con printerId
const { products, categories, visibleProducts, ... } = useFilteredProducts({ ... });

const { printCommands } = usePrintCommands({
  enabled: comandasEnabled,
  categories,   // NUEVO — ya disponibles
});
```

En `handleConfirmCheckout` (línea 222):
```ts
// antes: printOrder({ ... })
// ahora:
const printResult = await printOrder(
  { ... },               // PrintOrderOptions (sin cambios)
  defaultReceiptPrinter, // NUEVO
);
```

El bloque `if (comandasEnabled) { printCommands(synchronizedCartItems) }` (línea 268) queda igual — `usePrintCommands` ya tiene `categories` internamente.

## UI Changes

### `PrinterSettingsPanel.tsx`

#### Toggle "Predeterminada" (nuevo)

Visible solo cuando `formState.role === PRINTER_ROLE.RECEIPT`. Un `Checkbox`/`Switch` que setea `formState.isDefault`. El payload `toPrinterPayload` incluye `isDefault`. Al guardar, el repo desmarca la default anterior en transacción.

```tsx
{formState.role === PRINTER_ROLE.RECEIPT && (
  <FormField label={t("settings:printer.defaultLabel")} htmlFor="printer-is-default">
    <Checkbox
      id="printer-is-default"
      checked={formState.isDefault}
      onCheckedChange={(checked) =>
        setFormState((prev) => ({ ...prev, isDefault: checked === true }))
      }
    />
    <p className="text-2xs text-text-muted">{t("settings:printer.defaultDescription")}</p>
  </FormField>
)}
```

`PrinterFormState` gana `isDefault: boolean`. `buildEmptyFormState` → `isDefault: false`. `buildFormStateFromPrinter` → `isDefault: printer.isDefault`.

#### i18n-ización (labels hardcoded → keys)

Inventario de strings hardcoded actuales → keys `settings.printer.*`:

| String actual | Key i18n |
|----------------|----------|
| `"Impresoras"` (h2) | `settings.printer.title` |
| `"Nueva"` | `settings.printer.new` |
| `"Sin impresoras."` | `settings.printer.emptyState` |
| `"Nueva impresora"` / `"Editar impresora"` | `settings.printer.createTitle` / `editTitle` |
| `"Nombre"` | `settings.printer.nameLabel` |
| `"Cocina"` (placeholder) | `settings.printer.namePlaceholder` |
| `"Rol"` | `settings.printer.roleLabel` |
| `"Seleccionar rol"` | `settings.printer.rolePlaceholder` |
| `"Caja (ticket)"` / `"Cocina"` / `"Barra"` / `"Otro"` | `settings.printer.roleReceipt` / `roleKitchen` / `roleBar` / `roleOther` |
| `"Tipo de conexión"` | `settings.printer.typeLabel` |
| `"Seleccionar tipo"` | `settings.printer.typePlaceholder` |
| `"Red (TCP)"` / `"USB"` / `"Etiqueta"` | `settings.printer.typeNetwork` / `typeUsb` / `typeLabelPrinter` |
| `"Dirección"` | `settings.printer.addressLabel` |
| `"192.168.1.100:9100"` / `"04b8:0e15"` | `settings.printer.addressPlaceholderNetwork` / `addressPlaceholderUsb` |
| helper network/usb/label | `settings.printer.addressHelperNetwork` / `addressHelperUsb` / `addressHelperLabel` |
| `"Ancho (mm)"` / `"Alto (mm)"` / `"Gap (mm)"` | `settings.printer.labelWidthMm` / `labelHeightMm` / `labelGapMm` |
| `"Lenguaje de etiqueta"` | `settings.printer.labelLanguageLabel` |
| `"Seleccionar lenguaje"` | `settings.printer.labelLanguagePlaceholder` |
| `"Probar"` | `settings.printer.testButton` |
| `"Crear impresora"` / `"Guardar cambios"` | `settings.printer.createButton` / `saveButton` |
| `"Archivar impresora"` (dialog title) | `settings.printer.archiveTitle` |
| `"¿Archivar {{name}}? ..."` | `settings.printer.archiveConfirm` |
| `"Archivar"` (confirm) | `settings.printer.archiveButton` |
| `"Falta dirección"` / `"Configurada"` | `settings.printer.statusMissingAddress` / `statusConfigured` |
| `"Archivar {{name}}"` (aria) | `settings.printer.archiveAriaLabel` |
| `"Texto de la comanda"` / `"COMANDA"` / helper / `"Guardar"` | `settings.printer.comandaHeaderTitle` / `comandaHeaderPlaceholder` / `comandaHeaderHelper` / `comandaHeaderSaveButton` |
| `"Encabezado de comanda guardado"` / `"Error..."` / `"Cambios sin guardar"` | `settings.printer.comandaHeaderSaved` / `comandaHeaderError` / `comandaHeaderChangesUnsaved` |
| `"Impresora respondió correctamente"` / desc / `"No se pudo conectar..."` | `settings.printer.testSuccess` / `testSuccessDesc` / `testError` |
| `"Completá nombre y dirección."` / `"Seleccioná una impresora."` | `settings.printer.formErrorNameAddress` / `formErrorSelectPrinter` |
| **NUEVAS** (toggle default) | `settings.printer.defaultLabel` / `defaultDescription` |

Key de error nueva en `errors.printer.*`:

| Key | es-MX value |
|-----|-------------|
| `errors.printer.printerDefaultRoleInvalid` | `"Solo las impresoras con rol 'Caja (ticket)' pueden ser predeterminadas."` |

Todas las keys se propagan a `en-US`, `es-AR`, `es-ES`, `pt-BR` (guard `locale-completeness.spec.ts`).

#### Deprecación

`PrinterSettingsCard.tsx` (legacy, en `settings/components/`) se depreca — no se elimina. El ticket pasa a leer de `printers`; `settingsStore.printerType/Address` queda como dead code. `manifest.ts` con `settingsLabel: "Impresoras"` hardcoded se deja por ahora (el `ModuleManifest` no soporta i18n keys — fuera de scope).

## Test Strategy

TDD estricto por unidad cohesiva (RED → GREEN → REFACTOR en cada una). Una unidad = un `general` con su ciclo completo.

### Factories primero

`src/modules/printer/test/factories.ts` (NEW) — dueño = módulo printer:

```ts
import type { Printer } from "@/modules/printer/domain/printer";
import { PRINTER_TYPE, PRINTER_ROLE, PRINTER_LABEL_LANGUAGE } from "@/modules/printer/domain/printer";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

export function buildPrinter(overrides: Partial<Printer> = {}): Printer {
  return {
    id: "printer-1",
    name: "Cocina",
    type: PRINTER_TYPE.NETWORK,
    address: "192.168.1.100:9100",
    role: PRINTER_ROLE.KITCHEN,
    isDefault: false,
    labelWidthMm: 40,
    labelHeightMm: 30,
    labelGapMm: 2,
    labelLanguage: PRINTER_LABEL_LANGUAGE.TSPL,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}
```

Importable por path directo (`@/modules/printer/test/factories`), nunca vía barrel.

### Specs por unidad

| Unidad (general) | Spec | Capa | RED: qué falla | GREEN: qué se implementa |
|------------------|------|------|----------------|------------------------|
| **Factories** | `printer/test/factories.spec.ts` (NEW) | unit | `buildPrinter` no existe | `buildPrinter` + overrides |
| **Domain printer** | `printer/domain/printer.spec.ts` (NEW o update) | unit | `Printer.isDefault` no tipa | campo `isDefault` en interfaz |
| **Persistence invariant** | `printer/persistence/printer-drizzle.repository.spec.ts` (NEW) | unit (DB en memoria) | (a) marcar 2 defaults deja 2; (b) `isDefault=true` con `role!=receipt` no valida | transacción "solo un default" + `printerDefaultRoleInvalid` + mapeo `isDefault` |
| **Use-cases** | `printer/use-cases/create-printer.spec.ts` / `update-printer.spec.ts` (update) | unit | `isDefault=true, role=kitchen` no rechaza | validación rol-default en use-case |
| **buildKitchenCommands rewrite** | `checkout/lib/build-kitchen-commands.spec.ts` (NEW o update) | unit | (a) items sin `categoryId` no se omiten; (b) items de categoría sin `printerId` no se omiten; (c) items se agrupan por impresora, no por `role=kitchen` broadcast | rewrite del builder |
| **printOrder puro** | `checkout/adapters/print-ticket.adapter.spec.ts` (NEW) | unit | `printOrder` lee `useSettingsStore` (mock); nuevo: recibe `Printer\|null` | `printOrder(input, printer)` sin store |
| **usePrintCommands** | `checkout/hooks/use-print-commands.spec.ts` (NEW o update) | unit | `categories` no se pasa al builder | hook recibe `categories`, construye CartLine con `categoryId` |
| **PrinterSettingsPanel** | `printer/components/admin/PrinterSettingsPanel.dom.spec.tsx` (NEW) | DOM | (a) toggle default no renderiza; (b) labels hardcoded sin `t()` | toggle condicional a `role=receipt` + i18n keys |
| **i18n completeness** | `shared/i18n/locale-completeness.spec.ts` (existente) | unit | keys nuevas no están en 4 locales | propagar a en-US, es-AR, es-ES, pt-BR |
| **App.tsx wiring** | (manual QA + smoke) | integration | `printOrder` sin `defaultReceiptPrinter` arg | wiring en `handleConfirmCheckout` |

### TDD por unidad — orden sugerido (tandas)

```
Tanda 1 (base):    general → printer/test/factories.ts (RED→GREEN→REFACTOR)
   ↓ verificar
Tanda 2 (paralelo, independientes):
  general → domain printer (isDefault) + persistence invariant
  general → build-kitchen-commands rewrite
  general → printOrder puro
   ↓ verificar
Tanda 3 (paralelo):
  general → use-cases validation
  general → usePrintCommands hook
  general → PrinterSettingsPanel toggle + i18n
   ↓ verificar
Tanda 4:           general → i18n propagation (5 locales) + guard verde
```

## Migration Strategy

### `src-tauri/migrations/0023_printer_is_default.sql` (NEW)

```sql
-- 1. Columna is_default en printers
ALTER TABLE `printers` ADD COLUMN `is_default` INTEGER NOT NULL DEFAULT 0;

-- 2. Migrar config legacy de system_settings a printers (idempotente)
--    Solo si existe config legacy válida Y no hay receipt default activa
INSERT INTO `printers` (`id`, `name`, `type`, `address`, `role`, `is_default`, `created_at`, `updated_at`)
SELECT
  'receipt-default-legacy',
  'Caja',
  `printer_type`,
  `printer_address`,
  'receipt',
  1,
  strftime('%s','now') * 1000,
  strftime('%s','now') * 1000
FROM `system_settings`
WHERE `id` = 'current'
  AND `printer_type` IS NOT NULL
  AND `printer_type` != 'none'
  AND `printer_address` IS NOT NULL
  AND `printer_address` != ''
  AND NOT EXISTS (
    SELECT 1 FROM `printers`
    WHERE `role` = 'receipt' AND `is_default` = 1 AND `deleted_at` IS NULL
  );
```

### Registro en `src-tauri/src/lib.rs`

Agregar al array `migrations` (después de versión 22):

```rust
Migration {
    version: 23,
    description: "printer_is_default",
    sql: include_str!("../migrations/0023_printer_is_default.sql"),
    kind: MigrationKind::Up,
},
```

### Idempotencia

- `ALTER TABLE ADD COLUMN ... DEFAULT 0`: SQLite rechaza re-aplicar `ALTER TABLE` sobre columna existente — pero Tauri solo aplica migraciones no-aplicadas (trackea versiones), así que no se re-ejecuta.
- `INSERT ... NOT EXISTS`: si ya hay receipt default activa (por re-run o por config manual), no inserta. El `id` fijo `'receipt-default-legacy'` evita duplicados si la migración se re-evaluara (defensa adicional, aunque Tauri no lo haría).

### Preservación de datos legacy

- `system_settings.printer_type` y `printer_address` **no se borran** — se deprecian.
- `settingsStore` sigue leyéndolas (sin romper), pero `printOrder` ya no las usa.
- `PrinterSettingsCard` legacy (si queda activo) sigue funcionando contra el store — no se rompe.

### Rollback

- Revertir commits.
- **No revertir la migración** si hay datos de producción: `ALTER TABLE ADD COLUMN` no es reversible sin reescribir la tabla. Si se necesita, dejar `is_default` nullable y deprecarla (no borrar la columna — rompe checksum de Tauri).
- Restaurar `build-kitchen-commands.ts` (broadcast por `role=kitchen`), `print-ticket.adapter.ts` (lee store), labels hardcoded.

## Data Flow — Sequence

### Flujo de ticket (después del cambio)

```
App.tsx
  │ usePrinters({ enabled: receiptPrintingEnabled })
  │   └→ printers (cache TanStack Query)
  │ defaultReceiptPrinter = printers.find(role===receipt && isDefault) ?? null
  │
  │ handleConfirmCheckout
  │   └→ printOrder(orderOptions, defaultReceiptPrinter)
  │        │ if null → okAsync(undefined) (no imprime)
  │        │ else → buildPayload(opts, printer.type, printer.address)
  │        │        → invoke("print_ticket", { input: payload })
  │        │             └→ Rust: print_ticket (ESC-POS) — SIN CAMBIOS
```

### Flujo de comanda (después del cambio)

```
App.tsx
  │ useFilteredProducts → categories (con printerId)
  │ usePrintCommands({ enabled: comandasEnabled, categories })
  │   └→ usePrinters → printers
  │       useSettingsStore → comandaHeaderText → headerText
  │
  │ handleConfirmCheckout
  │   └→ printCommands(synchronizedCartItems)
  │        │ map CartItem → CartLine { product: {id, name, categoryId}, ... }
  │        │ buildKitchenCommands(cartLines, printers, categories, headerText)
  │        │   │ map categoryId → printerId (desde categories)
  │        │   │ map printerId → Printer (desde printers)
  │        │   │ agrupar cartLines por category.printerId
  │        │   │ por grupo, por unidad (quantity=1): emitir PrintCommandOptions
  │        │   │   sin fallback: categoryId null / printerId null / printer ausente → omitir
  │        │   └→ PrintCommandOptions[]
  │        │ Promise.all(commands.map(printCommand))
  │        │   └→ invoke("print_command", { input: payload })
  │        │          └→ Rust: print_command (ESC-POS o TSPL según printerType) — SIN CAMBIOS
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/migrations/0023_printer_is_default.sql` | Create | `ALTER TABLE printers ADD COLUMN is_default` + migración legacy idempotente |
| `src-tauri/src/lib.rs` | Modify | Registrar migración versión 23 |
| `src/shared/db/schema.ts` | Modify | `isDefault` en `printers` |
| `src/modules/printer/domain/printer.ts` | Modify | `Printer.isDefault`, `PrinterCreateInput.isDefault?` |
| `src/modules/printer/domain/errors.ts` | Modify | `printerDefaultRoleInvalid` en `PrinterErrorCode` |
| `src/modules/printer/persistence/printer-drizzle.repository.ts` | Modify | `rowToPrinter` mapea `isDefault`; validación rol-default; transacción "solo un default" en `create`/`update` |
| `src/modules/printer/use-cases/create-printer.ts` | Modify | Validación `isDefault+role`, normalize con `isDefault` |
| `src/modules/printer/use-cases/update-printer.ts` | Modify | Igual que create |
| `src/modules/printer/hooks/use-printers.ts` | Unchanged | `PrinterCreateInput` ya incluye `isDefault?`; sin cambios de firma |
| `src/modules/printer/components/admin/PrinterSettingsPanel.tsx` | Modify | Toggle "Predeterminada" condicional a `role=receipt`; i18n-ización completa de labels |
| `src/modules/printer/test/factories.ts` | Create | `buildPrinter` compartida |
| `src/modules/checkout/lib/build-kitchen-commands.ts` | Modify | Rewrite: `CartLine.product.categoryId` nuevo; recibe `categories`; agrupa por `category.printerId`; sin fallback |
| `src/modules/checkout/hooks/use-print-commands.ts` | Modify | Recibe `categories`; construye CartLine con `categoryId` |
| `src/modules/checkout/adapters/print-ticket.adapter.ts` | Modify | `printOrder(input, defaultReceiptPrinter)` — puro, sin `useSettingsStore` |
| `src/modules/checkout/components/print-ticket.ts` | Unchanged | Barrel re-exporta `printOrder` (firma nueva se propaga) |
| `src/app/App.tsx` | Modify | `usePrinters` + deriva `defaultReceiptPrinter`; pasa a `printOrder`; pasa `categories` a `usePrintCommands` |
| `src/shared/i18n/locales/{es-MX,en-US,es-AR,es-ES,pt-BR}/settings.json` | Modify | Keys `settings.printer.*` |
| `src/shared/i18n/locales/{...}/errors.json` | Modify | `errors.printer.printerDefaultRoleInvalid` |
| `src/modules/menu/domain/category.ts` | Unchanged | `printerId` ya existe — solo se consume |
| `src/modules/settings/components/PrinterSettingsCard.tsx` | Deprecated | No se elimina; ticket deja de leer el store |
| `src/modules/printer/manifest.ts` | Unchanged | `settingsLabel` hardcoded se deja (fuera de scope i18n del manifest) |

## Interfaces / Contracts — Resumen de firmas

```ts
// printer/domain/printer.ts
interface Printer { ...; isDefault: boolean; ... }
interface PrinterCreateInput { ...; isDefault?: boolean; ... }

// printer/persistence (contrato lógico, no cambia la interfaz PrinterRepository)
// create/update garantizan invariant "solo un default" vía transacción interna

// checkout/lib/build-kitchen-commands.ts
interface CartLine { product: { id: string; name: string; categoryId: string | null }; quantity: number; selectedModifiers: SelectedModifier[] }
function buildKitchenCommands(cartLines: CartLine[], printers: Printer[], categories: Category[], headerText: string): PrintCommandOptions[]

// checkout/adapters/print-ticket.adapter.ts
function printOrder(input: PrintOrderOptions, defaultReceiptPrinter: Printer | null): ResultAsync<void, Error>

// checkout/hooks/use-print-commands.ts
interface UsePrintCommandsOptions { enabled?: boolean; categories: Category[] }
function usePrintCommands(options: UsePrintCommandsOptions): { printCommands: (cartItems: CartItem[]) => Promise<Error[]> }
```

## Open Questions

- [ ] **Soporte de `db.batch` en el driver de `@tauri-apps/plugin-sql`**: la transacción "solo un default" asume `db.batch([stmt1, stmt2])` (Drizzle SQLite). Si el driver no lo soporta, fallback a `db.transaction(async (tx) => { ... })` o dos queries secuenciales con lock. Verificar en la fase de implementación (primer test del invariant debe confirmar atomicidad). Si ninguno está disponible, documentar la limitación y aceptar una ventana minúscula de inconsistencia (mitigada por validación en use-case).
- [ ] **Comandas habilitadas sin categorías habilitadas**: si `comandas_enabled=true` pero `categories_enabled=false`, `useFilteredProducts` retorna `categories=[]` → ninguna comanda se imprime (sin fallback). ¿Se debe validar esta combinación en el panel de flags o se acepta el comportamiento silencioso? Decisión tentativa: aceptar y documentar (el usuario ve que no imprime y debe habilitar categorías). Confirmar con QA.
- [ ] **`testPrinter` en `print-ticket.adapter.ts`**: queda leyendo `useSettingsStore` (deprecated). ¿Se elimina en este cambio o se deja como dead code? Tentativa: dejar como dead code (el `PrinterSettingsPanel` usa `testPrinter` de `test-printer.adapter.ts`, no este). Limpiar en cambio futuro.