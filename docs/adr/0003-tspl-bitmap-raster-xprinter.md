# ADR-0003: Renderizado bitmap para impresoras XPrinter (CMD:XPP,XL)

## Status

Accepted

## Context

Bako soporta impresoras de etiquetas térmicas conectadas por USB. La impresora de referencia es la BEEPRT BY-480BT (VID `09C6:0426`), fabricada por AiYin/Xiamen iprt Technology — un clon del firmware XPrinter que reporta `CMD:XPP,XL` en su IEEE 1284 device ID.

El protocolo TSPL/TSPL2 (TSC Printer Language) es el estándar para estas impresoras. La implementación original usaba el comando `TEXT` de TSPL para renderizar texto directamente en la impresora:

```
TEXT 10,20,"0",0,1,1,"BAKO TEST"
```

Sin embargo, durante las pruebas con la impresora física descubrimos que **el firmware XPrinter no implementa el comando `TEXT`**. Al recibir `TEXT`, la impresora hace beep (USB ack) y el motor arranca, pero el firmware crashea — la impresora se desconecta del bus USB y no imprime nada.

Capturamos el tráfico del driver oficial de macOS (CUPS `rastertolabel`) que SÍ funciona con esta impresora, y confirmamos que el driver oficial **nunca usa `TEXT`** — siempre renderiza a un bitmap 1-bit y lo envía con el comando `BITMAP`:

```
BITMAP 0,0,40,240,0,<9600 bytes de raster data>
```

Esto se confirma en múltiples proyectos open-source que manejan impresoras con `CMD:XPP,XL` (Munbyn, Phomemo, Rollo, Marklife): todas usan raster, no text nativo.

## Decision

**Todo el texto para impresoras de etiqueta se renderiza a un bitmap 1-bit en Rust y se envía con el comando `BITMAP` de TSPL, nunca con `TEXT`.**

El rendering se hace con `ab_glyph` y una font DejaVu Sans Mono embebida (`include_bytes!`), a 203 dpi (8 dots/mm). El bitmap resultante sigue la convención TSPL/CUPS: MSB-first, `0`=black dot, `1`=white.

El flujo completo por job de impresión es:

1. **64 bytes de NUL preamble** (`0x00`) — sync/wakeup requerido por el firmware XPrinter.
2. **Comandos de setup TSPL**: `SIZE`, `SET RIBBON OFF`, `REFERENCE`, `GAP` (en dots, no mm), `OFFSET`, `DENSITY`, `SETC AUTODOTTED OFF`, `SETC PAUSEKEY ON`, `SETC WATERMARK ON`, `CLS`.
3. **`BITMAP 0,0,{width_bytes},{height_dots},0,{raw binary data}`** — mode 0 (uncompressed), datos binarios inmediatamente después de la coma.
4. **`PRINT 1,1`** — sin comando `END` (no es TSPL2 estándar y causa que el firmware descarte el job).

El transporte USB usa `nusb` con `flush_end()` (short-packet termination) en vez de `flush()`.

## Alternatives considered

1. **Usar el comando `TEXT` de TSPL**
   - Rechazado: el firmware XPrinter no lo implementa. Causa crash del firmware y desconexión USB.

2. **Usar ZPL en vez de TSPL**
   - Rechazado: aunque la impresora reporta `CMD:XPP,XL`, el driver oficial de CUPS la maneja como TSPL. LPrint (de Michael R Sweet, creador de CUPS) mapea `CMD:XPP,XL` al driver TSPL. Múltiples proyectos independientes confirmaron que el protocolo es TSPL.

3. **Renderizar texto en el frontend (JS) y mandar PNG**
   - Rechazado: requeriría agregar dependencias de canvas/image en el frontend, aumentar el payload por orders de magnitude, y complejizar el contrato frontend-backend. El rendering en Rust con `ab_glyph` es más eficiente y mantiene la lógica de impresión en el backend.

4. **Usar el modo comprimido del BITMAP (mode 3)**
   - Rechazado: mode 3 es una extensión vendor-specific del firmware XPrinter. Mode 0 (uncompressed) es estándar TSPL2 y funciona correctamente. La compresión no justifica la complejidad ni el acoplamiento al vendor.

5. **Mandar el NUL preamble de 192 bytes (como munbyn-label-studio)**
   - Rechazado: capturamos el tráfico del driver oficial de macOS y usa 64 bytes, no 192. Reducir el preamble a 64 bytes funciona correctamente.

## Consequences

- (+) La impresora imprime correctamente sin crashear.
- (+) El rendering de texto soporta cualquier font TTF embebida — no depende de fonts del firmware.
- (+) El bitmap se puede usar para más que texto: códigos de barras, logos, etc.
- (-) El payload por etiqueta es más grande (~10KB vs ~200 bytes con TEXT) porque incluye raster data.
- (-) Se agregó la dependencia `ab_glyph` y una font TTF embebida (340KB) al binario.
- (-) El rendering de texto es más complejo que mandar un string — hay que manejar layout, kerning, y bitmap packing.
- (~) Los otros lenguajes (ZPL, EPL, CPCL) siguen usando comandos TEXT nativos porque no se han probado con hardware físico. Si se confirma que tampoco soportan TEXT, deberán migrar a raster también.

## Agent guidance

- **Nunca** usar el comando `TEXT` de TSPL para impresoras de etiqueta. El firmware XPrinter crashea.
- **Siempre** renderizar texto a bitmap con `raster::render_label()` y enviar con `BITMAP ... mode 0`.
- **Nunca** enviar el comando `END` al final del job TSPL — no es estándar y causa que el firmware descarte el job.
- **Siempre** enviar 64 bytes de NUL preamble antes de los comandos TSPL — el firmware XPrinter lo requiere como sync/wakeup.
- **Siempre** usar `flush_end()` (no `flush()`) en el `EndpointWrite` de nusb — el short-packet termination es necesario para que la impresora procese el buffer.
- **Usar `GAP` en dots, no en mm** — el firmware XPrinter espera dots a 203 dpi (1mm = 8 dots).
- Los comandos `SETC AUTODOTTED OFF`, `SETC PAUSEKEY ON`, `SETC WATERMARK ON` son específicos del firmware XPrinter y deben enviarse antes de `CLS`.
- Si se agrega soporte para otra impresora de etiqueta que SÍ soporta `TEXT`, considerar un flag de render mode (text vs raster) en `LabelConfig` en vez de hardcodear raster.
- El código afectado vive en: `src-tauri/src/print/label/tspl.rs`, `src-tauri/src/print/label/raster.rs`, `src-tauri/src/print/raw_usb.rs`.

## Related

- `src-tauri/src/print/label/tspl.rs` — builder de comandos TSPL con BITMAP
- `src-tauri/src/print/label/raster.rs` — renderer de texto a bitmap 1-bit
- `src-tauri/src/print/label/DejaVuSansMono.ttf` — font embebida
- `src-tauri/src/print/raw_usb.rs` — transporte USB con NUL preamble y flush_end
- `src-tauri/Cargo.toml` — dependencia `ab_glyph`
- LPrint TSPL driver: https://github.com/michaelrsweet/lprint/blob/master/lprint-tspl.h
- munbyn-label-studio (TSPL capture): https://github.com/naeemarsalan/munbyn-label-studio