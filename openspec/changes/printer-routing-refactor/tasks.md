# Tasks: Perfiles de impresora + enrutamiento por categoría

> Referencias: [proposal.md](./proposal.md) · [design.md](./design.md) · [PRD.md](./PRD.md) · specs en `specs/*/spec.md` (7 capabilities, 46 escenarios).
>
> TDD estricto por unidad cohesiva: **RED** (test del comportamiento nuevo, debe fallar) → **GREEN** (código mínimo) → **REFACTOR** (limpiar en verde). Backend Rust intacto (no hay `cargo test` en este cambio).
>
> Comandos: `bun run test` (todos) · `bun run test:node` (solo `.spec.ts`) · `bun run test:dom` (solo `.dom.spec.tsx`) · `bun run lint`.

## Phase 1: Foundation

Migración `0023` + schema Drizzle + factory `buildPrinter` compartida (dueño = módulo `printer`).

- [ ] 1.1 Create `src-tauri/migrations/0023_printer_is_default.sql`: `ALTER TABLE printers ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0` + migración de datos legacy idempotente (`INSERT INTO printers ... SELECT FROM system_settings WHERE printer_type IS NOT NULL AND printer_type != 'none' AND printer_address IS NOT NULL AND printer_address != '' AND NOT EXISTS (SELECT 1 FROM printers WHERE role='receipt' AND is_default=1 AND deleted_at IS NULL)`). Columnas legacy se deprecian (no se borran).
- [ ] 1.2 Register migration version 23 in `src-tauri/src/lib.rs` `migrations` array (después de versión 22): `Migration { version: 23, description: "printer_is_default", sql: include_str!("../migrations/0023_printer_is_default.sql"), kind: MigrationKind::Up }`.
- [ ] 1.3 Modify `src/shared/db/schema.ts`: agregar `isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false)` a la tabla `printers` (consistente con `menus.isDefault` y `modifierOptions.isDefault`).
- [ ] 1.4 **RED:** Create `src/modules/printer/test/factories.spec.ts`: (a) `buildPrinter()` sin args retorna `Printer` válido con defaults (id no vacío, `deletedAt: null`); (b) `buildPrinter({ role: "receipt", isDefault: true, name: "Caja 1" })` sobreescribe esos campos y conserva el resto; (c) `buildPrinter({ type: "network", address: "192.168.1.50:9100" })` sobreescribe anidados. Correr `bun run test:node --testPathPattern=printer/test/factories` y confirmar fallo (`buildPrinter` no existe).
- [ ] 1.5 **GREEN:** Create `src/modules/printer/test/factories.ts` exportando `buildPrinter(overrides: Partial<Printer> = {}): Printer` con defaults del design (id, name, type NETWORK, address, role KITCHEN, `isDefault: false`, label dims 40/30/2, labelLanguage TSPL, `FIXED_DATE`). Importable por path directo `@/modules/printer/test/factories`, nunca vía barrel.
- [ ] 1.6 **REFACTOR:** Revisar `buildPrinter` por claridad; mantener `bun run test:node --testPathPattern=printer/test/factories` en verde.
- [ ] 1.7 Verificar: `bun run test:node` + `bun run test:dom` + `bun run lint` en verde.

## Phase 2: Domain & Persistence

`Printer.isDefault` en dominio + error `printerDefaultRoleInvalid` + transacción "solo un default" en persistencia + mapeo `rowToPrinter`.

- [ ] 2.1 **RED:** Update/create `src/modules/printer/domain/printer.spec.ts` (o test a nivel de tipos) afirmando que `Printer` incluye `isDefault: boolean` y `PrinterCreateInput` incluye `isDefault?: boolean`. Correr `bun run test:node` y confirmar fallo de tipo.
- [ ] 2.2 **GREEN:** Modify `src/modules/printer/domain/printer.ts`: agregar `isDefault: boolean` a `Printer`; `isDefault?: boolean` a `PrinterCreateInput`; `PrinterUpdateInput = PrinterCreateInput`.
- [ ] 2.3 Add `printerDefaultRoleInvalid` a `PrinterErrorCode` en `src/modules/printer/domain/errors.ts`.
- [ ] 2.4 **RED:** Create `src/modules/printer/persistence/printer-drizzle.repository.spec.ts` (NEW, DB en memoria): (a) crear dos receipt printers ambas `isDefault=true` → queda exactamente una con `isDefault=true` (invariant I1); (b) `isDefault=true` con `role!=="receipt"` → rechazada con `printerDefaultRoleInvalid`; (c) actualizar receipt `B` a `isDefault=true` desmarca la `A` previa; (d) `rowToPrinter` mapea `isDefault` bidireccionalmente; (e) impresora creada sin `isDefault` carga como `false`. Correr `bun run test:node --testPathPattern=printer/persistence` y confirmar fallos.
- [ ] 2.5 **GREEN:** Modify `src/modules/printer/persistence/printer-drizzle.repository.ts`: mapear `isDefault` en `rowToPrinter` (`row.isDefault ?? false`); agregar validación `printerDefaultRoleInvalid` en `validatePrinterInput` (`isDefault===true && role!==RECEIPT`); implementar transacción "solo un default" en `create`/`update` — desmarcar la default anterior (excluyendo la editada en `update` vía `ne(printers.id, id)`) y marcar la nueva atómicamente (`db.batch` o `db.transaction` según soporte del driver `@tauri-apps/plugin-sql`).
- [ ] 2.6 **REFACTOR:** Extraer helper `buildUnsetDefaultStmt(excludeId?)` si se duplica entre `create`/`update`; mantener `bun run test:node --testPathPattern=printer/persistence` en verde.
- [ ] 2.7 Verificar: `bun run test:node` + `bun run test:dom` + `bun run lint` en verde.

## Phase 3: Checkout Core

Rewrite de `build-kitchen-commands.ts` (routing por `category.printerId`, agrupado por impresora, sin fallback) + `printOrder` puro + `usePrintCommands` con `categories`.

> Nota de alineación spec vs design: los specs `category-printer-routing` y `print-command-routing` exigen agrupar items con `quantity=N` en un solo comando por impresora (NO un comando por unidad). El pseudocódigo del design (líneas 315-337) describe "un command por unidad con quantity=1" — los **specs son la fuente de verdad**; el builder agrupa con `quantity=N`.

- [ ] 3.1 **RED:** Create/update `src/modules/checkout/lib/build-kitchen-commands.spec.ts` (NEW): (a) categoría con `printerId="p-1"` + item → un comando dirigido a `P1.address` con el item; (b) categoría con `printerId=null` → array vacío; (c) `printerId` no en lista de printers → item omitido; (d) dos categorías con misma impresora → un comando con ambos items; (e) item `quantity=4` → un comando con item `quantity=4` (NO cuatro comandos por unidad); (f) impresoras `role=kitchen` sin categoría asignada → array vacío (no broadcast por rol); (g) categoría asignada a impresora `role=bar` → enruta igual (el routing lo define la categoría, no el rol). Correr `bun run test:node --testPathPattern=build-kitchen-commands` y confirmar fallos (firma actual no recibe `categories`, hace broadcast por rol).
- [ ] 3.2 **GREEN:** Rewrite `src/modules/checkout/lib/build-kitchen-commands.ts`: nueva firma `buildKitchenCommands(cartLines, printers, categories, headerText)`; agregar `categoryId: string | null` a `CartLine.product`; construir mapa `categoryId → printerId` desde `categories` (filtrando `deletedAt === null`, `printerId !== null`); indexar `printers` por `id`; agrupar `cartLines` por `category.printerId`; emitir **un comando por impresora** con items llevando `quantity=N` (agrupado, no por unidad); sin fallback (categoryId null / printerId null / printer ausente → omitir). Importar `Category` de `@/modules/menu/domain/category`. Preservar shape `PrintCommandOptions` (incluido `destination` con `labelWidthMm/HeightMm/GapMm/Language`).
- [ ] 3.3 **REFACTOR:** Extraer `buildCategoryToPrinterMap(categories)` y `groupLinesByPrinter(lines, map)` si mejora claridad; mantener `bun run test:node --testPathPattern=build-kitchen-commands` en verde.
- [ ] 3.4 **RED:** Create `src/modules/checkout/adapters/print-ticket.adapter.spec.ts` (NEW): (a) `printOrder(input, R)` con `R` receipt `type=usb` → payload con `printerType=usb`, `printerAddress` de `R`; (b) `printOrder(input, R)` con `R` `type=network` → payload con `printerAddress` de red; (c) `printOrder(input, null)` → `okAsync(undefined)` y NO invoca `print_ticket`; (d) el módulo NO importa `useSettingsStore`. Correr `bun run test:node --testPathPattern=print-ticket.adapter` y confirmar fallos (firma actual lee el store, no recibe printer).
- [ ] 3.5 **GREEN:** Modify `src/modules/checkout/adapters/print-ticket.adapter.ts`: `printOrder(input: PrintOrderOptions, defaultReceiptPrinter: Printer | null): ResultAsync<void, Error>`; si `null` → `okAsync(undefined)`; else `buildPayload(input, printer.type, printer.address)` + `invoke("print_ticket", { input: payload })`. Remover import de `useSettingsStore` y check `printerType === "none"`. Marcar `testPrinter` legacy del archivo como deprecated (dejar como dead code — `PrinterSettingsPanel` usa `test-printer.adapter.ts`).
- [ ] 3.6 **REFACTOR:** Mantener `print-ticket.adapter.spec.ts` en verde; eliminar imports muertos.
- [ ] 3.7 **RED:** Create/update `src/modules/checkout/hooks/use-print-commands.spec.ts` (NEW o update): hook recibe `categories: Category[]` en options; `printCommands(cartItems)` mapea `CartItem` → `CartLine` con `product.categoryId` y pasa `categories` a `buildKitchenCommands`. Correr `bun run test:node --testPathPattern=use-print-commands` y confirmar fallo (firma actual no recibe `categories`).
- [ ] 3.8 **GREEN:** Modify `src/modules/checkout/hooks/use-print-commands.ts`: nueva interfaz `UsePrintCommandsOptions { enabled?: boolean; categories: Category[] }`; en `printCommands`, mapear `CartItem` → `CartLine` incluyendo `product.categoryId`; llamar `buildKitchenCommands(cartLines, printers, categories, headerText)`.
- [ ] 3.9 **REFACTOR:** Mantener `use-print-commands.spec.ts` en verde.
- [ ] 3.10 Verificar: `bun run test:node` + `bun run test:dom` + `bun run lint` en verde.

## Phase 4: UI & i18n

Toggle "Predeterminada" en `PrinterSettingsPanel` (condicional a `role=receipt`) + i18n-ización completa de labels + propagación a 5 locales.

- [ ] 4.1 **RED:** Create `src/modules/printer/components/admin/PrinterSettingsPanel.dom.spec.tsx` (NEW): (a) toggle "Predeterminada" renderiza para `role=receipt`, NO renderiza para `role=kitchen`; (b) activar el toggle setea `isDefault=true` en el form state y el payload de guardado; (c) todos los textos visibles provienen de `t("settings:printer.*")` (sin literales hardcoded en español). Correr `bun run test:dom --testPathPattern=PrinterSettingsPanel` y confirmar fallos. No modificar tests viejos — agregar `describe` nuevo al final, mantener `data-testid`/`getByRole`/`getByLabelText`.
- [ ] 4.2 **GREEN:** Modify `src/modules/printer/components/admin/PrinterSettingsPanel.tsx` — toggle default: agregar `isDefault: boolean` a `PrinterFormState`; `buildEmptyFormState` → `isDefault: false`; `buildFormStateFromPrinter` → `isDefault: printer.isDefault`; renderizar `Checkbox` condicional a `formState.role === PRINTER_ROLE.RECEIPT` con `t("settings:printer.defaultLabel")` + `t("settings:printer.defaultDescription")`; incluir `isDefault` en `toPrinterPayload`.
- [ ] 4.3 **GREEN:** Modify `src/modules/printer/components/admin/PrinterSettingsPanel.tsx` — i18n-ización: reemplazar todos los strings hardcoded en español por `t("settings:printer.*")` keys según inventario del design (title, new, emptyState, createTitle, editTitle, nameLabel, namePlaceholder, roleLabel, rolePlaceholder, roleReceipt/kitchen/bar/other, typeLabel, typePlaceholder, typeNetwork/usb/labelPrinter, addressLabel, addressPlaceholderNetwork/usb, addressHelperNetwork/usb/label, labelWidthMm/HeightMm/GapMm, labelLanguageLabel/Placeholder, testButton, createButton/saveButton, archiveTitle/Confirm/Button/AriaLabel, statusMissingAddress/statusConfigured, comandaHeaderTitle/Placeholder/Helper/SaveButton/Saved/Error/ChangesUnsaved, testSuccess/testSuccessDesc/testError, formErrorNameAddress/formErrorSelectPrinter, defaultLabel/defaultDescription).
- [ ] 4.4 Add nuevas keys `settings.printer.*` a `src/shared/i18n/locales/es-MX/settings.json` (incl. `defaultLabel`, `defaultDescription` y todas del inventario).
- [ ] 4.5 Add key `errors.printer.printerDefaultRoleInvalid` a `src/shared/i18n/locales/es-MX/errors.json` con valor `"Solo las impresoras con rol 'Caja (ticket)' pueden ser predeterminadas."`.
- [ ] 4.6 Propagar keys `settings.printer.*` a `src/shared/i18n/locales/en-US/settings.json` con traducciones coherentes al inglés.
- [ ] 4.7 Propagar keys `settings.printer.*` a `src/shared/i18n/locales/es-AR/settings.json`.
- [ ] 4.8 Propagar keys `settings.printer.*` a `src/shared/i18n/locales/es-ES/settings.json`.
- [ ] 4.9 Propagar keys `settings.printer.*` a `src/shared/i18n/locales/pt-BR/settings.json`.
- [ ] 4.10 Propagar `errors.printer.printerDefaultRoleInvalid` a `errors.json` de `en-US`, `es-AR`, `es-ES`, `pt-BR`.
- [ ] 4.11 **REFACTOR:** Mantener `PrinterSettingsPanel.dom.spec.tsx` en verde; conservar los mismos `data-testid`/`getByRole`/`getByLabelText` en tests existentes.
- [ ] 4.12 Verificar: `bun run test` (incl. guard `locale-completeness.spec.ts`) + `bun run test:dom` + `bun run lint` en verde.

## Phase 5: Wiring & Integration

Wiring en `App.tsx`: obtener default receipt printer + categorías con `printerId` e inyectarlos en `printOrder` y `usePrintCommands`.

- [ ] 5.1 **RED:** Update spec de checkout/App afirmando que `handleConfirmCheckout` llama `printOrder(orderOptions, defaultReceiptPrinter)` con la receipt printer default derivada, y que `usePrintCommands` recibe `categories`. Correr `bun run test` y confirmar fallo (llamada actual a `printOrder` sin segundo arg; `usePrintCommands` sin `categories`).
- [ ] 5.2 **GREEN:** Modify `src/app/App.tsx`: importar `usePrinters` y `PRINTER_ROLE`; llamar `usePrinters({ enabled: receiptPrintingEnabled || comandasEnabled })`; derivar `defaultReceiptPrinter = printers.find(p => p.role === PRINTER_ROLE.RECEIPT && p.isDefault) ?? null`; pasar `categories` (de `useFilteredProducts`) a `usePrintCommands({ enabled: comandasEnabled, categories })`; en `handleConfirmCheckout` llamar `printOrder(orderOptions, defaultReceiptPrinter)`.
- [ ] 5.3 **REFACTOR:** Mantener tests de checkout/App en verde; remover reads muertos de `useSettingsStore` usados solo para impresión de ticket.
- [ ] 5.4 Verificar: `bun run test:node` + `bun run test:dom` + `bun run lint` en verde.

## Phase 6: Tests & Verification

Actualización de specs de use-cases existentes + suite completa + guards.

- [ ] 6.1 Update `src/modules/printer/use-cases/create-printer.spec.ts`: caso `isDefault=true, role=kitchen` → rechaza con `printerDefaultRoleInvalid`; caso `isDefault=false` con cualquier rol → ok; caso `isDefault` omitido → default `false`.
- [ ] 6.2 Update `src/modules/printer/use-cases/update-printer.spec.ts`: mismos casos de validación rol-default que create.
- [ ] 6.3 Run `bun run test:node` y corregir cualquier fallo.
- [ ] 6.4 Run `bun run test:dom` y corregir cualquier fallo.
- [ ] 6.5 Run `bun run lint` y corregir warnings/errores.
- [ ] 6.6 Verificar guard `locale-completeness.spec.ts` en verde (todas las keys nuevas propagadas a los 5 locales).
- [ ] 6.7 QA smoke manual: confirmar ticket de venta imprime con la impresora `printers` default (no `system_settings`); confirmar comandas enrutan por `category.printerId`; confirmar categorías sin impresora no generan comanda; confirmar migración `0023` preserva config legacy existente.
- [ ] 6.8 Verificar: `bun run test` + `bun run test:dom` + `bun run lint` en verde (gate final).
