# Printing

This guide elaborates on [`BAKO.md`](../../BAKO.md). If anything here conflicts with `BAKO.md`, `BAKO.md` wins.

This is the TypeScript/frontend entry point into the print subsystem. The Rust engine has its own doc, kept where it lives: [`src-tauri/src/print/README.md`](../../src-tauri/src/print/README.md). That doc is not duplicated here — it covers a different language, a different toolchain, and its own test cycle (`cargo test --lib print::`). This page only covers what a frontend contributor needs before touching a print call: which module owns what, which Tauri commands exist, and how a print job travels from a button click to a physical printer.

Frontend code is named by module and role rather than by file path, so a file moving inside its module does not stale this page. Paths under `src-tauri/` are exact.

---

## 1. Two modules, one confusing name

`printer` and `print` sound like the same thing. They are not, and the split is intentional:

| | `src/modules/printer/` | `src-tauri/src/print/` |
|---|---|---|
| Language | TypeScript (frontend) | Rust (backend) |
| Owns | Printer **configuration**: CRUD on the `printers` table, printer-to-category assignment, the Settings panel | Printer **engine**: byte generation (ESC/POS, TSPL/ZPL/EPL/CPCL) and transport (USB bulk, TCP) |
| Answers | "What printers exist? What type/address/role does each have?" | "Given a payload and an address, how do I turn it into bytes a physical printer accepts?" |
| Talks to hardware directly? | No | Yes |

`src/modules/printer/` never builds a byte stream and never opens a USB handle. It owns the `Printer` record (`type: "usb" \| "network" \| "label"`, `address`, `role: "receipt" \| "comanda"`, label dimensions/language/orientation) and hands that configuration to whoever needs to print. It calls into the Rust engine only for two configuration-time actions:

- `list_usb_printers` — discover connected USB printers when an admin is adding one.
- `test_printer` — send a test page for a printer being configured.

The actual "print this sale" or "print this kitchen ticket" calls do **not** live in `printer`. They live in the modules that produce something worth printing — ticket printing and kitchen-command printing in `checkout`, and the shift-report reprint flow in `shift-reports` — which read a `Printer` record's `type`/`address`/label settings and pass them straight through as the target for `print_ticket` / `print_command`.

---

## 2. The Tauri commands

Verified against `src-tauri/src/commands.rs` (the shared Tauri command file — these functions live there, not inside `src-tauri/src/print/`; `print/mod.rs` only re-exports the engine's public API that `commands.rs` calls into). Registered in `src-tauri/src/lib.rs`'s `generate_handler!`.

| Command | Rust function | Called from (frontend) | Purpose |
|---|---|---|---|
| `print_ticket` | `print_ticket` | `checkout` — ticket printing; `shift-reports` — shift-report reprint | Print a sale receipt (ESC/POS only) |
| `print_command` | `print_command` | `checkout` — kitchen-command printing | Print a kitchen/bar command (ESC/POS receipt printer or TSPL label printer, dispatched by `printerType`) |
| `test_printer` | `test_printer` | `printer` — test page for a printer being configured | Send a test page to a configured printer |
| `list_usb_printers` | `list_usb_printers` | `printer` — USB discovery | Detect connected USB printers for the "add printer" flow |

They all take/return plain serializable structs (`Result<T, String>` on the Rust side); errors cross the IPC boundary as strings and are wrapped back into `Error`/`ResultAsync` on the TypeScript side (per ADR-0002, never surfaced to the UI as raw `error.message`).

---

## 3. End-to-end flow

At a high level, ignoring the line-by-line detail already in the Rust README:

1. A frontend module (`checkout`, `shift-reports`) builds a payload from domain data plus a `Printer` record's `type`/`address`/label config, and calls `invoke("print_command", { input: payload })` (or `print_ticket`).
2. The call crosses the Tauri IPC boundary into `commands.rs`, which builds a strongly-typed input struct and calls into `print::adapter::create_printer_driver(printer_type, printer_address)` to pick the right driver for the target.
3. The engine builds the bytes for the job — ESC/POS via `print::ticket` for receipts, or TSPL/ZPL/EPL/CPCL via `print::label` for labels (see routes below).
4. The driver writes the bytes to the physical transport: the `escpos` crate's own USB/network transport for receipt printers, or `print::raw_usb` (raw `nusb` bulk OUT, XPrinter-specific handshake) for label printers on macOS/Linux.
5. The `Result<(), String>` travels back across IPC and becomes a resolved/rejected `ResultAsync` for the calling module.

## 4. Two printing routes

| Route | Driver | Protocol | Reference hardware |
|---|---|---|---|
| Tickets (receipts, kitchen commands) | `escpos` crate | ESC/POS | Epson TM-T20, Bixolon, Star Micronics |
| Labels | `RawLabelUsbDriver` (`nusb`) or `escpos` (network) | TSPL, bitmap `BITMAP` command | BEEPRT BY-480BT (XPrinter firmware, `CMD:XPP,XL`) |

Labels are rasterized to a 1-bit bitmap in Rust before printing — the XPrinter firmware crashes on TSPL's native `TEXT` command. See [ADR-0003](../adr/0003-tspl-bitmap-raster-xprinter.md) for why, and `src-tauri/src/print/label/raster.rs` for the renderer.

---

## Further reading

- [`src-tauri/src/print/README.md`](../../src-tauri/src/print/README.md) — full Rust module reference: file layout, both drivers, the raster renderer, USB detection, and the Rust test matrix.
- [ADR-0003](../adr/0003-tspl-bitmap-raster-xprinter.md) — why labels are rasterized instead of using TSPL's native `TEXT`.
- [ADR-0002](../adr/0002-domain-error-translation.md) — why print errors are translated at the UI boundary instead of surfacing `error.message`.
