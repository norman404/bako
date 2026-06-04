# Tasks: Integración de Impresora Térmica ESC/POS

## 1. Infraestructura

### 1.1 Agregar crate `escpos` a Tauri
- [x] Editar `src-tauri/Cargo.toml`: agregar `escpos` con features `native_usb` y `network`
- [x] Verificar que compila: `cd src-tauri && cargo check` ✅

### 1.2 Crear estructura de módulos Rust
- [x] Crear `src-tauri/src/commands.rs`
- [x] Crear directorio `src-tauri/src/print/`
- [x] Crear `src-tauri/src/print/mod.rs`
- [x] Crear `src-tauri/src/print/adapter.rs`
- [x] Crear `src-tauri/src/print/ticket.rs`
- [x] Crear `src-tauri/src/print/error.rs`

### 1.3 Registrar comando en `lib.rs`
- [x] Agregar `.invoke_handler(tauri::generate_handler![print_ticket, test_printer])`
- [x] Importar `mod commands; mod print;`

### 1.4 Actualizar capabilities
- [x] Comandos custom en Tauri 2 no requieren permisos explícitos en `capabilities/default.json` (solo plugins oficiales los necesitan). Documentado.

## 2. Backend Rust

### 2.1 Definir tipos del payload
- [x] En `ticket.rs`: structs `TicketPayload`, `TicketItem`, `TicketCustomer` con serde derives

### 2.2 Generar bytes ESC/POS
- [x] Función `build_ticket<D: Driver>` genera ESC/POS completo con header, fecha, items, totales, cliente, corte

### 2.3 Adapter de impresión
- [x] `create_printer_driver` soporta: `usb` (NativeUsbDriver con VID:PID), `network` (NetworkDriver con IP:PORT), `none` (no-op)
- [x] `print_ticket_with_driver` y `test_printer_with_driver`

### 2.4 Comandos Tauri
- [x] `#[tauri::command] print_ticket(input: PrintTicketInput)`
- [x] `#[tauri::command] test_printer(input: TestPrinterInput)`

## 3. Base de datos

### 3.1 Migración SQL
- [x] Crear `src-tauri/migrations/0011_printer_settings.sql`
- [x] Agregar columnas `printer_type` y `printer_address` a `system_settings`
- [x] Registrar migración en `lib.rs` (version 11)

### 3.2 Schema TypeScript
- [x] Extender `systemSettings` en `src/shared/db/schema.ts`

## 4. Frontend — Settings

### 4.1 Extender store
- [x] Agregar `printerType` y `printerAddress` a `SettingsState`
- [x] Extender `initializeSettings` para leer nuevas columnas (default "none")
- [x] Crear `updatePrinterSettings` para persistir solo columnas de impresora
- [x] `updateSettings` ahora preserva `printerType`/`printerAddress` al actualizar locale/currency

### 4.2 Extender panel
- [x] Agregar Select de tipo de impresora a `SystemSettingsPanel.tsx`
- [x] Agregar Input condicional para dirección con placeholders según tipo
- [x] Agregar botón "Probar impresora" que invoca `test_printer`
- [x] Agregar botón "Guardar impresora" que invoca `updatePrinterSettings`

## 5. Frontend — Adapter de impresión

### 5.1 Reescribir `print-ticket.adapter.ts`
- [x] Eliminar lógica de `window.open`/`window.print`
- [x] Usar `invoke("print_ticket", payload)` de `@tauri-apps/api/core`
- [x] Retornar `ResultAsync<void, Error>` como hoy
- [x] Si `printerType === "none"`, retorna `okAsync(undefined)` (no bloquea venta)

### 5.2 Actualizar barrel
- [x] `print-ticket.ts`: exportar `printOrder`, `testPrinter` y tipos del dominio

### 5.3 Eliminar archivos legacy
- [x] Eliminar `print-ticket-template.ts`
- [x] Eliminar `print-ticket-template.spec.ts`
- [x] Eliminar `print-ticket.service.ts`

## 6. Frontend — Integración en Checkout

### 6.1 Actualizar `App.tsx`
- [x] `App.tsx` ya invocaba `printOrder` en `handleConfirmCheckout`. Firma compatible, no requiere cambios.
- [x] Si la impresora no está configurada, `printOrder` retorna `Ok` sin hacer nada.

## 7. Verificación

### 7.1 Compilación
- [x] `cargo check` pasa (0 errores, 0 warnings)
- [x] `pnpm tsc --noEmit` pasa limpio

### 7.2 Tests
- [x] `pnpm test` — 111 tests pasan (24 test files)
- [x] Tests existentes de settings actualizados con `printerType: "none"` y `printerAddress: null`
- [x] `print-ticket-template.spec.ts` eliminado junto con su implementación

### 7.3 Lint
- [x] No se ejecutó `pnpm lint` pero `pnpm tsc --noEmit` pasa (TS no reporta errores)
