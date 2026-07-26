# Tasks: Soporte de impresoras de etiquetas TSPL

## Phase 1: Foundation

- [ ] 1.1 Add `LABEL: "label"` to `PRINTER_TYPE` and update `Printer`/`CreateInput`/`UpdateInput` in `src/modules/printer/domain/printer.ts`.
- [ ] 1.2 Add nullable `labelWidthMm`, `labelHeightMm`, `labelGapMm` columns to `printers` in `src/shared/db/schema.ts`.
- [ ] 1.3 Create migration `src-tauri/migrations/0021_label_printer_columns.sql` and register it in `src-tauri/src/lib.rs`.
- [ ] 1.4 Update `src/modules/printer/persistence/printer-drizzle.repository.ts` to accept `"label"` and apply defaults 40/30/2 when null.

## Phase 2: Rust TSPL Core (TDD)

- [ ] 2.1 **RED:** Write Rust unit tests for `tspl::build_label_bytes` (defaults, header, items, modifiers) and `build_test_label` before implementation; run `cargo test` and confirm failures.
- [ ] 2.2 **GREEN:** Create `src-tauri/src/print/tspl/mod.rs` with `LabelPayload`, `build_label_bytes`, and `build_test_label`.
- [ ] 2.3 **REFACTOR:** Clean `tspl/mod.rs`; extract constants for defaults and font spacing; keep `cargo test` green.
- [ ] 2.4 Update `src-tauri/src/print/mod.rs` to expose `tspl`.

## Phase 3: Rust Routing and Commands (TDD)

- [ ] 3.1 **RED:** Write Rust tests for `adapter.rs` dispatch: `"label"` → TSPL, `"usb"`/`"network"` → ESC/POS; run `cargo test` and confirm failures.
- [ ] 3.2 **GREEN:** Modify `src-tauri/src/print/adapter.rs` to route by `printer_type` and add `print_tspl_command_with_driver`.
- [ ] 3.3 Modify `src-tauri/src/commands.rs` so `PrintCommandInput` carries dimensions and `print_command` routes to TSPL or ESC/POS.
- [ ] 3.4 Update `src-tauri/src/commands.rs` `test_printer` to handle `"label"` with TSPL test page.

## Phase 4: Frontend Wiring

- [ ] 4.1 Update `src/modules/checkout/domain/print-command.ts` to include optional label dimensions in destination.
- [ ] 4.2 Update `src/modules/checkout/lib/build-kitchen-commands.ts` to pass `labelWidthMm/HeightMm/GapMm`.
- [ ] 4.3 Update `src/modules/checkout/adapters/print-command.adapter.ts` to include dimensions in the `print_command` payload.
- [ ] 4.4 Update `src/modules/printer/components/admin/PrinterSettingsPanel.tsx` to show `"label"` option and dimension inputs conditionally.
- [ ] 4.5 Update `src/modules/printer/adapters/test-printer.adapter.ts` to pass dimensions when type is `"label"`.
- [ ] 4.6 Add i18n keys for label width/height/gap in `src/shared/i18n/locales/{es-MX,en-US,es-AR,es-ES,pt-BR}.json`.

## Phase 5: Tests and Verification

- [ ] 5.1 Add/update TypeScript tests for `printer-drizzle.repository.ts` (label type + defaults).
- [ ] 5.2 Add/update DOM tests for `PrinterSettingsPanel.tsx` (label fields visibility and submission).
- [ ] 5.3 Add/update tests for `print-command.adapter.ts` (dimensions included).
- [ ] 5.4 Run `cargo test` and fix any failures.
- [ ] 5.5 Run `bun run test:node` and fix any failures.
- [ ] 5.6 Run `bun run test:dom` and fix any failures.
- [ ] 5.7 Run `bun run lint` and fix any warnings/errors.
