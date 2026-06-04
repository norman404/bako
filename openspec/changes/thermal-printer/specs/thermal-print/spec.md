# Spec: Impresión Térmica ESC/POS

## Requisito

Como cajero, quiero que al completar una venta se imprima automáticamente un ticket físico en la impresora térmica configurada, para entregar al cliente y/o cocina sin intervención manual.

## Context

Actualmente la impresión genera HTML/CSS y abre `window.print()`. Esto requiere que el usuario seleccione impresora en el diálogo del OS, no funciona bien con impresoras térmicas ESC/POS, y no permite impresión silenciosa. Se reemplazará por envío directo de comandos ESC/POS desde Rust/Tauri.

## Scenarios

### ESCENARIO 1: Imprimir ticket tras venta exitosa

**Given** que hay una impresora configurada en `system_settings` (`printerType` y `printerAddress`)
**And** el cajero confirma el checkout
**When** la orden se crea exitosamente
**Then** el sistema invoca el comando Tauri `print_ticket` con los datos de la orden
**And** el backend Rust genera bytes ESC/POS y los envía a la impresora
**And** si la impresión falla, se muestra un toast de error (no se bloquea el flujo de venta)

### ESCENARIO 2: Ticket con formato correcto

**Given** que se envía una orden al backend
**When** se generan los bytes ESC/POS
**Then** el ticket DEBE incluir:
  - Número de ticket formateado (`#0001`)
  - Fecha y hora de la orden
  - Tipo de pedido (Local / Delivery)
  - Método de pago (Efectivo / Tarjeta)
  - Lista de productos con cantidad, precio unitario y subtotal
  - Total general
  - Monto recibido/cobrado y cambio (solo efectivo)
  - Datos del cliente (solo delivery)
  - Corte de papel al final

### ESCENARIO 3: Error de impresión no bloquea la venta

**Given** que la impresora está desconectada o mal configurada
**When** se intenta imprimir tras crear una orden
**Then** la venta SE COMPLETA igualmente
**And** se muestra un toast de error con el mensaje de la impresora
**And** el carrito se limpia y el modal de checkout se cierra

### ESCENARIO 4: Impresora no configurada

**Given** que `printerType` es `null` o no está configurado
**When** se intenta imprimir tras crear una orden
**Then** NO se envía nada a la impresora
**And** la venta se completa normalmente (sin toast de error)

## Reglas

- `printOrder` (adapter) DEBE retornar `ResultAsync<void, Error>` como hoy, para compatibilidad con el caller en `App.tsx`.
- El comando Tauri `print_ticket` DEBE aceptar un payload JSON serializable que contenga todos los datos del ticket.
- El backend DEBE generar bytes ESC/POS puros, no depender de drivers del OS.
- Si la impresora no responde o no está disponible, el error DEBE ser capturado y propagado al frontend.
- La impresión DEBE ser síncrona desde la perspectiva del frontend: `await invoke("print_ticket")`.

## Notas de implementación

- Crate recomendado: `escpos` (fabienbellanger) con features `native_usb` y `network`.
- Se usará `Printer::new(...)` con `PageCodeTable::PC437`, `JustifyMode::CENTER` para el header, y `print_cut()` al final.
- Los items se formatean con ancho fijo de 48 columnas (impresora 80mm, ~48 chars en font normal).
