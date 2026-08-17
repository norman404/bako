## Exploration: Support TSPL label printers (BEEPRT BY-480BT)

### Current State

Bako has two independent printing paths today:

1. **Legacy receipt printer** (`settings` → `checkout`)
   - `settings` stores `printerType: "usb" | "network" | "none"` and `printerAddress`.
   - `PrinterSettingsCard.tsx` lets the user pick USB/network, scan USB, and save to `system_settings`.
   - `checkout/adapters/print-ticket.adapter.ts` calls `invoke("print_ticket", { input: payload })` when `printerType !== "none"`.
   - `checkout/adapters/print-ticket.adapter.ts` also exposes `testPrinter()` that calls `invoke("test_printer")`.

2. **New comanda (kitchen/bar) printer** (`printer` module)
   - TypeScript domain: `PrinterType = "usb" | "network"`; `PrinterRole = "receipt" | "kitchen" | "bar" | "other"`.
   - `printers` table in SQLite holds `name`, `type`, `address`, `role`.
   - `PrinterSettingsPanel.tsx` CRUDs printers and offers a "Probar" button that uses `printer/adapters/test-printer.adapter.ts`.
   - `checkout/adapters/print-command.adapter.ts` builds a `PrintCommandPayload` and calls `invoke("print_command")`, reading the destination from a printer entry.

**Rust print pipeline**

- Tauri command handlers: `commands.rs` → `print_ticket`, `print_command`, `test_printer`, `list_usb_printers`.
- All three print commands create a `PrinterDriver` via `adapter.rs::create_printer_driver(type, address)`.
- `adapter.rs` currently only knows `"usb"`, `"network"`, `"none"` and uses the `escpos` crate for both USB and network transport.
- `ticket.rs` builds ESC/POS byte sequences for receipts (`build_ticket`) and kitchen commands (`build_command`) using `escpos::printer::Printer` and PC858 codepage.
- `test_printer_with_driver` also writes ESC/POS commands and calls `print_cut()`.
- USB detection (`usb_detection.rs`) is transport-only: it returns `vid`, `pid`, `name`, `address`; it does not encode what command language a device speaks.

So today the architecture conflates *transport* (USB vs network) and *protocol* (ESC/POS). A label printer can also be USB, but it needs a different wire language: TSPL instead of ESC/POS.

### Affected Areas

- `src-tauri/src/print/adapter.rs` — `create_printer_driver` and `print_*_with_driver` assume every driver is an ESC/POS `escpos::driver::Driver`. Needs to know protocol.
- `src-tauri/src/print/ticket.rs` — `build_ticket` and `build_command` are ESC/POS only. TSPL needs new label-oriented builders.
- `src-tauri/src/print/error.rs` — may need a TSPL/label generation variant.
- `src-tauri/src/print/mod.rs` — re-exports; new modules for TSPL must be wired here.
- `src-tauri/src/commands.rs` — `print_ticket`/`print_command` payloads are fixed. Label printing probably needs a new command and payload (`print_label`) with label dimensions and barcode data.
- `src-tauri/Cargo.toml` — no TSPL crate today; either a new crate or raw byte generator.
- `src-tauri/src/lib.rs` — new Tauri command must be registered in `invoke_handler`.
- `src/modules/printer/domain/printer.ts` — `PrinterType` currently only `"usb"` / `"network"`. Need to distinguish a label printer, e.g. `"label"` or `"label-usb"`.
- `src/modules/printer/persistence/printer-drizzle.repository.ts` — `validatePrinterInput` rejects anything outside `["usb", "network"]`.
- `src/modules/printer/components/admin/PrinterSettingsPanel.tsx` — type options, address placeholder/hint, and test page behavior are hard-coded for ESC/POS USB/network.
- `src/modules/printer/adapters/test-printer.adapter.ts` — only forwards `printerType`/`printerAddress`.
- `src/modules/checkout/adapters/print-command.adapter.ts` — will need to route label printers to the new Tauri command.
- `src/shared/db/schema.ts` / `src-tauri/migrations/*.sql` — adding `label` to `type` does not require schema change (free text), but adding label-specific fields (width, height, density, gap, etc.) does.
- `src/modules/settings/store/settings-store.ts` — legacy `printerType` union `"usb" | "network" | "none"`. If TSPL is added only to the `printer` module (comandas), this store may be unaffected.
- `src/modules/settings/components/PrinterSettingsCard.tsx` — same as above; only touched if legacy receipt printer also gets label support. Recommendation: keep legacy receipt as ESC/POS, add TSPL only to the `printer` module.
- `src/shared/i18n/locales/*` — any new UI copy must propagate to all 5 locales (guard: `locale-completeness.spec.ts`).

### Approaches

1. **New TSPL module, same USB/network transports**
   - Add a new Rust module `src-tauri/src/print/tspl/` with a `LabelBuilder` that generates TSPL text/bytes (or uses a crate like `tspl` if available).
   - Keep USB/network transport: reuse `escpos::driver::NativeUsbDriver` / `NetworkDriver` only as a generic `write()` transport, bypassing the `escpos::printer::Printer` builder.
   - In `adapter.rs`, introduce a protocol enum (`EscPos`, `Tspl`) plus a transport enum (`Usb`, `Network`). `create_printer_driver` returns a `PrinterConnection` that can be used by either `EscPos` or `Tspl` printer.
   - Frontend `PrinterType` gains `LABEL_USB` / `LABEL_NETWORK` or a single `LABEL` with a connection subtype.
   - **Pros:**
     - Clean separation of transport and protocol.
     - Does not fork the existing ESC/POS builder.
     - `print_ticket` and `print_command` stay unchanged for receipt/comanda printers.
     - Easy to unit-test TSPL output without a real printer.
   - **Cons:**
     - More refactor in `adapter.rs` than the other options.
     - Need to abstract over the `escpos` driver so both ESC/POS and TSPL can write bytes.
   - **Effort:** Medium

2. **Add `"label"` type, generate TSPL inside `adapter.rs` only**
   - Extend `PrinterDriver` enum with `LabelUsb`, `LabelNetwork` and duplicate the `match` arms in `print_*_with_driver` to call a TSPL builder.
   - Reuse the same address parsing and `escpos` drivers as raw transports.
   - **Pros:**
     - Minimal change to existing dispatch code.
     - No new top-level protocol abstraction.
   - **Cons:**
     - Duplicates the transport/address parsing logic.
     - `print_command` semantics do not fit labels; still need a new frontend/backend path for label-specific payloads (dimensions, barcode, quantity).
     - Escalates `PrinterDriver` into a matrix of transport × protocol.
   - **Effort:** Medium-High

3. **Use a separate Rust crate for TSPL (if mature crate exists)**
   - Add a crate such as `tspl` / `tspl-printer` and treat it like `escpos`.
   - **Pros:**
     - Less protocol code to own.
   - **Cons:**
     - No widely-used, actively-maintained TSPL crate was visible in the current dependency list; adding an immature dependency introduces risk.
     - BY-480BT dialect may differ slightly from generic TSPL.
   - **Effort:** Low if crate fits; High if it needs patches.

### Recommendation

Go with **Approach 1** — new TSPL module, reuse existing USB/network transports as raw byte pipes.

Reasoning:
- The cleanest way to keep ESC/POS untouched is to separate *transport* from *protocol*. The existing `print_ticket` and `print_command` keep using ESC/POS forever.
- TSPL is text-based (`SIZE 40 mm,30 mm\nGAP 2 mm,0\n...\nPRINT 1\nEND\n`), so a small in-repo builder is trivial to test and avoids an external dependency.
- BY-480BT is a TSC/BEEPRT-compatible printer that speaks plain TSPL over USB bulk endpoint or network TCP; no special driver is required beyond the same `NativeUsbDriver`/`NetworkDriver` write path.
- Label printing is a different use case from comandas, so it should get its own Tauri command (`print_label`) and own domain payload rather than overloading `print_command`.

### Risks

- **BY-480BT TSPL dialect mismatches.** Some BEEPRT printers default to CPCL or have slightly different TSPL interpretations. Need a configurable command set or a `TSPL dialect` setting.
- **USB endpoint confusion.** The `escpos` crate opens USB printers with a specific interface/endpoint. If the label printer exposes a different interface, `NativeUsbDriver::open(vid, pid)` may fail or claim the wrong interface.
- **Frontend type collision.** Adding `label` as a `PrinterType` must not break existing `printers` rows with `usb`/`network` or the legacy receipt path that only understands `"usb" | "network" | "none"`.
- **Label dimensions/barcode data.** A label print needs width, height, gap, darkness, and barcode content. These fields are not in `printers` today. The schema stays text-based, but the UI needs a clean way to capture them.
- **No automated integration test against a physical printer.** We can test byte generation in Rust unit tests and mocked Tauri commands in TypeScript, but real USB/network printing requires manual QA.
- **Locale completeness guard.** Any new labels in the UI must be added to all supported locales before `bun run test` passes.

### Ready for Proposal

Yes — enough is known to write a proposal. The orchestrator should tell the user:
- TSPL support will be scoped to the `printer` module (comandas/labels), leaving the legacy receipt printer as ESC/POS.
- Label dimensions and a small amount of per-printer config will need UI fields.
- We will likely need a new Tauri command `print_label` instead of reusing `print_command`.
- A manual test with the BEEPRT BY-480BT is required once the byte generator is implemented.
