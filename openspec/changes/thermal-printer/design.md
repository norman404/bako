# Design: Integración de Impresora Térmica ESC/POS

## Decisión Arquitectónica: Backend Rust genera ESC/POS

La lógica de formato del ticket (qué texto, cómo alinear, dónde cortar) vivirá en el **backend Rust**, no en el frontend. El frontend solo envía los datos estructurados de la orden.

**Razón:** ESC/POS es un protocolo binario de bajo nivel. Centralizar la generación de bytes en Rust permite:
- Reutilizar el mismo formato si algún día se agregan otros backends (serial, Bluetooth).
- No exponer la complejidad ESC/POS al frontend TypeScript.
- Facilitar testing unitario del formato del ticket en Rust (si se agregan tests).

## Flujo de impresión

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   App.tsx    │     │  Adapter TS  │     │  Tauri Cmd   │
│  checkout    │────▶│ printOrder() │────▶│ print_ticket │
│  onSuccess   │     │  (invoke)    │     │   #[command] │
└──────────────┘     └──────────────┘     └──────────────┘
                                                   │
                                                   ▼
                                          ┌──────────────┐
                                          │  ESC/POS     │
                                          │  Generator   │
                                          │  (Rust)      │
                                          └──────────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              ▼                    ▼                    ▼
                        ┌─────────┐         ┌─────────┐         ┌─────────┐
                        │ Native  │         │ Network │         │ Console │
                        │ USB     │         │ TCP     │         │ (debug) │
                        │ (nusb)  │         │ (9100)  │         │         │
                        └─────────┘         └─────────┘         └─────────┘
```

## Estructura de módulos Rust

```
src-tauri/src/
├── lib.rs              # Entry point: registra plugin SQL, comando print_ticket
├── commands.rs         # #[tauri::command] handlers (print_ticket, test_printer)
├── print/
│   ├── mod.rs          # Re-exports
│   ├── adapter.rs      # Lógica: recibe datos, genera ESC/POS, envía a driver
│   ├── ticket.rs       # Generación de bytes ESC/POS (formato del ticket)
│   └── error.rs        # Errores del módulo de impresión
```

## Payload del comando `print_ticket`

```typescript
interface PrintTicketPayload {
  ticket_number: number;
  created_at: string;        // ISO 8601
  total: number;             // centavos
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;      // centavos
  }>;
  payment_method: "cash" | "card";
  payment_amount: number;    // centavos
  fulfillment_type: "local" | "delivery";
  customer: {
    name: string;
    phone: string;
    address: string;
  } | null;
}
```

## Formato ESC/POS del ticket

- **Inicialización**: `ESC @`
- **Header centrado, bold, doble ancho**: `BAKO` + número de ticket
- **Fecha/hora, tipo de pedido, método de pago**: alineación izquierda
- **Línea separadora**: `─` x 32
- **Items**: nombre truncado a 24 chars, cantidad, precio unitario, subtotal
- **Totales**: total bold, monto recibido/cobrado, cambio (si efectivo)
- **Datos cliente** (solo delivery)
- **Footer centrado**: "Gracias por tu compra"
- **Corte de papel**: `GS V 1` (partial cut)
- **Feed**: 3 líneas para que el ticket salga

## Configuración de impresora

```typescript
type PrinterType = "usb" | "network" | "none";

interface PrinterConfig {
  type: PrinterType;
  address: string | null;   // VID:PID para USB, IP:PORT para red
}
```

Persistencia: columnas `printer_type` y `printer_address` en `system_settings`.

## Cambios en Capabilities

Agregar `"print:allow-print-ticket"` a `default.json`. En Tauri 2, los comandos custom requieren permisos explícitos si se usa el sistema de capabilities. Como este será un comando propio, se agrega como string literal en la lista de permissions.

## Plan de migración

1. `0011_printer_settings.sql`:
   ```sql
   ALTER TABLE system_settings ADD COLUMN printer_type TEXT;
   ALTER TABLE system_settings ADD COLUMN printer_address TEXT;
   ```
2. Registrar en `lib.rs` como migración version 11.

## Eliminar código legacy

- `src/modules/checkout/lib/print-ticket-template.ts` → ELIMINAR
- `src/modules/checkout/adapters/print-ticket.adapter.ts` → REESCRIBIR (nuevo contenido: invoca Tauri)
- `src/modules/checkout/components/print-ticket.service.ts` → ELIMINAR
- `src/modules/checkout/components/print-ticket.ts` → ACTUALIZAR (nuevos exports)
- `src/modules/checkout/lib/print-ticket-template.spec.ts` → ELIMINAR o reescribir para adapter nuevo
