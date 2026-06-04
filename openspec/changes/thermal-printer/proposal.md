# Proposal: Integración de Impresora Térmica ESC/POS

## Intent

Reemplazar completamente la impresión basada en navegador (HTML/CSS + `window.print()`) por impresión directa a impresoras térmicas ESC/POS vía Rust/Tauri. Esto elimina la dependencia del diálogo de impresión del sistema operativo y permite imprimir tickets de forma inmediata y silenciosa al completar una venta.

## Scope

### Incluye
- Agregar crate `escpos` al backend Tauri con drivers USB (`nusb`) y red (`NetworkDriver`).
- Crear comandos Tauri (`print_ticket`, `list_printers`, `test_printer`) para exponer la impresión al frontend.
- Reemplazar el adapter `print-ticket.adapter.ts` (browser print) por uno que invoque comandos Tauri.
- Persistir configuración de impresora en `system_settings` (tipo: `usb` | `network`, dirección).
- Agregar panel de configuración de impresora en Settings (dentro de SystemSettingsPanel).
- Extender schema TypeScript y migración SQLite para campos de impresora.
- Integrar impresión automática en el flujo `onSuccess` de checkout en `App.tsx`.
- Eliminar código HTML/CSS de tickets y archivos duplicados (`print-ticket.service.ts`).
- Tests para la nueva lógica (Rust no tiene tests unitarios existentes, pero verificaremos compilación; frontend: tests de adapter/hooks).

### Excluye
- Soporte para impresoras Bluetooth/HID/Serial (USB + red cubren el 90% de casos; serial se puede agregar después).
- Cambios en la estructura de `CheckoutOrder` o en lógica de negocio de checkout (solo se cambia el mecanismo de impresión).
- Feature flag para impresora térmica (siempre disponible; se configura desde settings).
- Soporte para múltiples impresoras simultáneas (se usa una impresora principal configurada).

## Affected Modules
- `src-tauri/` — backend Rust: nuevos crates, comandos, capabilities.
- `src/modules/checkout/` — adapter de impresión, barrel exports, eliminación de HTML print.
- `src/modules/settings/` — store, panel, schema extendido.
- `src/shared/db/` — migración SQL, schema TypeScript.
- `src/app/App.tsx` — invocación de impresión en checkout.

## Approach
1. **Backend Rust**: agregar `escpos` con features `native_usb` y `network` a `Cargo.toml`. Crear módulo `print/` con un adapter que reciba datos del ticket y genere bytes ESC/POS. Registrar comando `print_ticket` en `lib.rs`.
2. **Migración**: nueva migración `0011_printer_settings.sql` para agregar columnas a `system_settings`.
3. **Schema**: extender `systemSettings` en `schema.ts` con `printerType`, `printerAddress`.
4. **Frontend adapter**: reescribir `print-ticket.adapter.ts` para invocar `invoke("print_ticket", payload)` en vez de abrir ventana.
5. **Settings**: extender `settings-store.ts`, `SystemSettingsPanel.tsx` para leer/guardar config de impresora.
6. **Integración**: en `App.tsx`, mantener la invocación de `printOrder` en `onSuccess` pero ahora va por Tauri.

## Rollback Plan
- Si falla la compilación de Rust o el crate `nusb` tiene problemas en alguna plataforma, se puede degradar a `ConsoleDriver` para debug, o agregar un feature flag `thermal_fallback` que use browser print.
- Los archivos HTML print se ELIMINAN — el rollback sería restaurarlos desde git. Confirmado con el usuario: no quiere fallback browser.

## Complexity
High — toca backend Rust (primeros comandos custom del proyecto), hardware USB, y cambios transversales en settings + checkout.
