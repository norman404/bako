# PRD: Soporte de impresoras de etiquetas TSPL (BEEPRT BY-480BT)

## Problema

Actualmente Bako solo soporta impresoras térmicas de recibos que hablan ESC/POS. Un usuario tiene una impresora de etiquetas BEEPRT BY-480BT conectada por USB. La app detecta la impresora, abre el driver, manda los bytes y reporta éxito, pero la impresora no hace nada porque no entiende ESC/POS. Esta impresora usa TSPL (TSC Printer Language).

## Objetivo

Agregar soporte para impresoras de etiquetas TSPL en el módulo `printer` de Bako, sin romper la impresión ESC/POS de recibos y comandas.

## Alcance

### Dentro del alcance
- Nuevo tipo de impresora `"label"` en el dominio `printer`.
- Nuevo comando Tauri `print_label` en Rust que genere TSPL y lo envíe por USB o red usando los mismos transportes que hoy usa `escpos`.
- Página de prueba TSPL accesible desde el panel de impresoras.
- Soporte para dimensiones de etiqueta configurables (ancho, alto, gap) y densidad opcional.
- Tests unitarios del generador TSPL en Rust.
- Tests del frontend para el nuevo tipo de impresora.

### Fuera del alcance
- No se modifica el flujo de impresora de recibo legacy (`settings` → `checkout`).
- No se soporta Bluetooth para esta primera versión.
- No se implementan códigos de barras complejos; solo texto básico en etiqueta.
- No se soportan otros lenguajes de etiquetas (ZPL, EPL, CPCL).

## Criterios de éxito
- El usuario puede configurar una impresora tipo `"label"` con ancho/alto/gap.
- El botón de prueba envía TSPL correcto y la BEEPRT BY-480BT imprime una etiqueta de prueba.
- Las impresoras `usb`/`network` existentes siguen funcionando.
- Toda la suite de tests pasa.