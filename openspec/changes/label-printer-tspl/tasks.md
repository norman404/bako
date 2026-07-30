# Tasks: Soporte de impresoras de etiquetas TSPL

## Phase 1: Foundation

- [x] 1.1 Add `LABEL: "label"` to `PRINTER_TYPE` and update `Printer`/`CreateInput`/`UpdateInput` in `src/modules/printer/domain/printer.ts`.
- [x] 1.2 Add nullable `labelWidthMm`, `labelHeightMm`, `labelGapMm` columns to `printers` in `src/shared/db/schema.ts`.
- [x] 1.3 Create migration `src-tauri/migrations/0021_label_printer_columns.sql` and register it in `src-tauri/src/lib.rs`.
- [x] 1.4 Update `src/modules/printer/persistence/printer-drizzle.repository.ts` to accept `"label"` and apply defaults 40/30/2 when null.

## Phase 2: Rust TSPL Core (TDD)

- [x] 2.1 **RED:** Write Rust unit tests for `tspl::build_label_bytes` (defaults, header, items, modifiers) and `build_test_label` before implementation; run `cargo test` and confirm failures.
- [x] 2.2 **GREEN:** Create `src-tauri/src/print/label/tspl.rs` with `LabelPayload`, `build_label_bytes`, and `build_test_label`.
- [x] 2.3 **REFACTOR:** Clean `tspl.rs`; extract constants for defaults and font spacing; keep `cargo test` green.
- [x] 2.4 Update `src-tauri/src/print/label/mod.rs` to expose `tspl`.

## Phase 3: Rust Routing and Commands (TDD)

- [x] 3.1 **RED:** Write Rust tests for `adapter.rs` dispatch: `"label"` → TSPL, `"usb"`/`"network"` → ESC/POS; run `cargo test` and confirm failures.
- [x] 3.2 **GREEN:** Modify `src-tauri/src/print/adapter.rs` to route by `printer_type` and add `print_tspl_command`.
- [x] 3.3 Modify `src-tauri/src/commands.rs` so `PrintCommandInput` carries dimensions and `print_command` routes to TSPL or ESC/POS.
- [x] 3.4 Update `src-tauri/src/commands.rs` `test_printer` to handle `"label"` with TSPL test page.

## Phase 4: Frontend Wiring

- [x] 4.1 Update `src/modules/checkout/domain/print-command.ts` to include optional label dimensions in destination.
- [x] 4.2 Update `src/modules/checkout/lib/build-kitchen-commands.ts` to pass `labelWidthMm/HeightMm/GapMm`.
- [x] 4.3 Update `src/modules/checkout/adapters/print-command.adapter.ts` to include dimensions in the `print_command` payload.
- [x] 4.4 Update `src/modules/printer/components/admin/PrinterSettingsPanel.tsx` to show `"label"` option and dimension inputs conditionally.
- [x] 4.5 Update `src/modules/printer/adapters/test-printer.adapter.ts` to pass dimensions when type is `"label"`.
- [x] 4.6 Add i18n keys for label width/height/gap in `src/shared/i18n/locales/{es-MX,en-US,es-AR,es-ES,pt-BR}.json`.

## Phase 5: Tests and Verification

- [x] 5.1 Add/update TypeScript tests for `printer-drizzle.repository.ts` (label type + defaults).
- [x] 5.2 Add/update DOM tests for `PrinterSettingsPanel.tsx` (label fields visibility and submission).
- [x] 5.3 Add/update tests for `print-command.adapter.ts` (dimensions included).
- [x] 5.4 Run `cargo test` and fix any failures.
- [x] 5.5 Run `bun run test:node` and fix any failures.
- [x] 5.6 Run `bun run test:dom` and fix any failures.
- [x] 5.7 Run `bun run lint` and fix any warnings/errors.

## Phase 6: Hardware Integration (post-implementation)

Descubrimientos durante la integración con la impresora física BEEPRT BY-480BT (VID 09C6:0426, firmware XPrinter CMD:XPP,XL). Ver [ADR-0003](../../../docs/adr/0003-tspl-bitmap-raster-xprinter.md).

- [x] 6.1 Remover comando `END` del output TSPL — no es estándar TSPL2, causa que el firmware descarte el job.
- [x] 6.2 Agregar `HOME` antes de `CLS` (luego removido en Phase 6.5 al simplificar comandos).
- [x] 6.3 Agregar VID `0x09C6` (BEEPRT) a `KNOWN_POS_VIDS` en `usb_detection.rs`.
- [x] 6.4 Cambiar `flush()` por `flush_end()` en `raw_usb.rs` — short-packet termination necesario para que la impresora procese el buffer.
- [x] 6.5 Agregar NUL preamble (64 bytes de `0x00`) antes de los comandos TSPL — sync/wakeup requerido por el firmware XPrinter.
- [x] 6.6 Cambiar `GAP` de mm a dots (gap_mm * 8 a 203dpi) — el firmware XPrinter espera dots.
- [x] 6.7 Agregar comandos `SETC AUTODOTTED OFF`, `SETC PAUSEKEY ON`, `SETC WATERMARK ON` antes de `CLS` — config específica del firmware XPrinter.
- [x] 6.8 Agregar `SET RIBBON OFF`, `REFERENCE 0,0`, `OFFSET 0 dot` al setup TSPL — matchear el driver oficial de CUPS.
- [x] 6.9 Reemplazar comando `TEXT` por `BITMAP` con raster rendering — el firmware XPrinter no implementa `TEXT` y crashea al recibirlo.
- [x] 6.10 Crear `label/raster.rs` con renderer de texto a bitmap 1-bit usando `ab_glyph` y font DejaVu Sans Mono embebida.
- [x] 6.11 Agregar dependencia `ab_glyph` al `Cargo.toml`.
- [x] 6.12 Refactor: limpiar logs de debug (`eprintln!` → `log::`), eliminar duplicación en `tspl.rs`, simplificar `adapter.rs` dispatch.