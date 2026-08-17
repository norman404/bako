# Módulo `print` (Rust backend)

Motor de impresión de Bako — tickets de venta, comandas de cocina, y etiquetas térmicas. Vive en `src-tauri/src/print/` y se expone al frontend vía Tauri commands.

## Responsabilidad

- Generar bytes de impresión para ESC/POS (tickets) y TSPL/ZPL/EPL/CPCL (etiquetas).
- Transportar los bytes al dispositivo: USB (bulk OUT) o TCP (network).
- Detectar impresoras USB conectadas.
- Renderizar texto a bitmap 1-bit para impresoras que no soportan `TEXT` nativo (ver [ADR-0003](../../../docs/adr/0003-tspl-bitmap-raster-xprinter.md)).

## Estructura

```
print/
  mod.rs              ← re-exports públicos + registro de comandos
  error.rs            ← PrintError enum
  adapter.rs          ← factory de drivers + dispatch (ESC/POS vs TSPL)
  ticket.rs           ← builders de tickets/comandas ESC/POS
  raw_usb.rs          ← transporte USB raw (nusb) para impresoras de etiqueta
  usb_detection.rs    ← detección de impresoras USB por class/VID
  label/
    mod.rs            ← LabelPayload, LabelLanguage, dispatch por lenguaje
    tspl.rs           ← builder TSPL con BITMAP raster
    raster.rs         ← renderer de texto a bitmap 1-bit (ab_glyph)
    DejaVuSansMono.ttf ← font embebida (include_bytes!)
    zpl.rs            ← builder ZPL (text nativo, sin probar en hardware)
    epl.rs            ← builder EPL (text nativo, sin probar en hardware)
    cpcl.rs           ← builder CPCL (text nativo, sin probar en hardware)
```

## Dos rutas de impresión

| Ruta | Driver | Protocolo | Hardware de referencia |
| --- | --- | --- | --- |
| Tickets (receipt) | `escpos` crate (NativeUsbDriver / WindowsUsbPrintDriver / NetworkDriver) | ESC/POS | Epson TM-T20, Bixolon, Star Micronics |
| Etiquetas (label) | `RawLabelUsbDriver` (nusb) o `escpos` (network) | TSPL con BITMAP raster | BEEPRT BY-480BT (XPrinter firmware, CMD:XPP,XL) |

## Flujo de una etiqueta TSPL

```
Frontend (print_command)
  → commands.rs (print_command)
    → adapter.rs (create_printer_driver → PrinterDriver::LabelUsb)
    → adapter.rs (print_tspl_command)
      → label/tspl.rs (build_label_bytes)
        → label/raster.rs (render_label → RasterLabel)
        → setup commands: SIZE, GAP, SETC, CLS
        → BITMAP 0,0,w,h,0,<raster data>
        → PRINT 1,1
      → raw_usb.rs (write_all)
        → 64 bytes NUL preamble
        → payload TSPL
        → flush_end() (short-packet termination)
        → drain IN endpoint
```

## Transporte USB raw (`raw_usb.rs`)

Las impresoras de etiqueta con firmware XPrinter (`CMD:XPP,XL`) no exponen el perfil USB ESC/POS estándar. `RawLabelUsbDriver` usa `nusb` directamente para:

1. Listar dispositivos por VID:PID.
2. Reclamar la interface USB class 0x07 (printer).
3. Encontrar el primer bulk OUT endpoint (y guardar el IN endpoint para drain).
4. Handshake mínimo: `GET_DEVICE_ID` + `clear_halt` (sin `GET_PORT_STATUS`/`SOFT_RESET` que stall en este firmware).
5. Escribir: 64 bytes NUL preamble + payload + `flush_end()`.

## Renderer raster (`label/raster.rs`)

Renderiza texto a un bitmap 1-bit monochrome para el comando `BITMAP` de TSPL.

- **Font**: DejaVu Sans Mono embebida con `include_bytes!` (340KB).
- **Resolución**: 203 dpi (8 dots/mm).
- **Formato**: 1 bit per pixel, MSB-first, `0`=black dot, `1`=white (convención TSPL/CUPS).
- **Tamaños**: header 24px, items 16px, modifiers 14px.
- **Padding**: cada row se padea a `width_bytes` (ceil(width_dots / 8)). El bitmap total es `width_bytes × height_dots` bytes.

Ver [ADR-0003](../../../docs/adr/0003-tspl-bitmap-raster-xprinter.md) para el porqué de este enfoque.

## Detección USB (`usb_detection.rs`)

Detecta impresoras USB conectadas filtrando por:

1. Device class 0x07 (Printer), o
2. Cualquier interface con class 0x07, o
3. VID en `KNOWN_POS_VIDS` (Epson, Bixolon, Star, Zebra, NXP, Winchiphead, STMicro, QinHeng, BEEPRT).

## Comandos Tauri (`commands.rs`)

| Comando | Función | Descripción |
| --- | --- | --- |
| `print_ticket` | `print_ticket` | Imprime ticket de venta (ESC/POS) |
| `print_command` | `print_command` | Imprime comanda de cocina (ESC/POS o TSPL) |
| `test_printer` | `test_printer` | Envía página de prueba |
| `list_usb_printers` | `list_usb_printers` | Lista impresoras USB detectadas |
| `debug_tspl` | `debug_tspl` | Devuelve los bytes TSPL generados sin enviar a la impresora |

## Tests

| Archivo | Qué cubre |
| --- | --- |
| `adapter.rs` | Parseo de direcciones USB/network, dispatch a TSPL, flush del driver |
| `ticket.rs` | Render de items/modifiers ESC/POS, encoding PC858 |
| `label/tspl.rs` | Estructura de comandos TSPL, BITMAP, dimensiones, sin TEXT ni END |
| `label/raster.rs` | Dimensiones del bitmap, padding, pixels negros por texto |
| `label/zpl.rs` | Estructura de comandos ZPL |
| `label/epl.rs` | Estructura de comandos EPL |
| `label/cpcl.rs` | Estructura de comandos CPCL |

Correr: `cargo test --lib print::` (30 tests).

## Dependencias

- `escpos` 0.19 — drivers ESC/POS (USB, network) y builder de tickets.
- `nusb` 0.2 — acceso USB raw para impresoras de etiqueta.
- `ab_glyph` 0.2 — rendering de texto a bitmap.
- `log` 0.4 — logging estructurado.

## Dependencias entre módulos

- `commands.rs` es invocado desde el frontend vía `invoke("print_command", ...)` etc.
- `adapter.rs` es el punto de entrada público (usado por `commands.rs`).
- `label/` es usado por `adapter.rs` cuando `printer_type == "label"`.
- `raw_usb.rs` es usado por `adapter.rs` cuando `printer_type == "label"` en macOS/Linux.
- El módulo `printer` del frontend (`src/modules/printer/`) maneja el CRUD de impresoras; este módulo Rust maneja la impresión real.