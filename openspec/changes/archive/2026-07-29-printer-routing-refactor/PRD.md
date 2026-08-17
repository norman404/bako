# PRD: Perfiles de impresora + enrutamiento por categoría

## Problema

Bako tiene dos modelos de impresora coexistiendo sin unificar:

1. **Modelo legacy single-printer** en `system_settings` (`printer_type`/`printer_address`): usado por el ticket de venta. Una sola impresora global, sin relación con la tabla `printers`.
2. **Modelo multi-printer** en tabla `printers` con `role` (receipt/kitchen/bar/other): usado por comandas. Pero el enrutamiento ignora la asignación `categories.printer_id` que ya existe en BD y en la UI — `build-kitchen-commands.ts` duplica cada unidad a TODAS las impresoras con `role=kitchen`, sin agrupar por categoría.

El campo `categories.printer_id` se persiste, se configura en `CategorySettingsPanel.tsx`, pero **no se lee al enrutar comandas**. Es un feature muerto.

## Objetivo

1. **Conectar `categories.printer_id` al enrutamiento real de comandas**: cada categoría enruta sus items a su impresora asignada. Items de categorías sin impresora asignada no se imprimen.
2. **Unificar el ticket de venta al modelo `printers`**: migrar de `system_settings.printer_type/address` (legacy) a `printers` con un flag `is_default` para marcar la impresora de ticket predeterminada.
3. **i18n-izar** los labels del `PrinterSettingsPanel` (hoy hardcoded en español).

## Alcance

### Dentro del alcance

- Migración `0023_printer_is_default.sql`: columna `is_default` en `printers` + migración de datos legacy.
- `Printer.isDefault` en dominio + validación (solo `role=receipt` puede ser default).
- Lógica "solo un default" en persistencia (transacción al actualizar).
- `build-kitchen-commands.ts` rewrite: agrupar items por `category.printerId`, dirigir comanda a la impresora asignada. Sin fallback — categoría sin impresora → no imprime.
- `print-ticket.adapter.ts`: dejar de leer `useSettingsStore`, recibir la impresora default receipt por parámetro.
- Wiring en `App.tsx`: obtener default receipt printer + categorías con `printerId` para el flujo de impresión.
- Toggle "Predeterminada" en `PrinterSettingsPanel.tsx` para printers con `role=receipt`.
- i18n-ización completa de `PrinterSettingsPanel.tsx` (labels, placeholders, estados).
- `printer/test/factories.ts` compartida (NO existe — cada spec duplica `buildPrinter`).
- Propagación de keys nuevas a los 4 locales (guard `locale-completeness.spec.ts`).

### Fuera del alcance

- N:M categoría→impresora (se mantiene 1:1 con `categories.printer_id`).
- Bluetooth.
- Eliminación física de columnas legacy (`system_settings.printer_type/address` se deprecian, no se borran).
- `PrinterSettingsCard.tsx` legacy: se depreca, no se elimina en este cambio.
- Backend Rust: no se toca los comandos existentes (`print_ticket`, `print_command`, `test_printer`).

## Decisiones resueltas

| Decisión | Resolución |
|---|---|
| Perfil de impresora | Reusar tabla `printers` (no entidad nueva) |
| Categoría→impresora | 1:1, manteniendo `categories.printer_id` existente |
| Ticket de venta | Migrar a `printers` con `is_default` |
| Fallback comanda | Sin fallback — categoría sin impresora → no se imprime |

## Criterios de éxito

- Una categoría con impresora asignada enruta sus comandas a ESA impresora, no a todas las kitchen.
- Una categoría sin impresora asignada no genera comanda para sus items.
- El ticket de venta se imprime con la impresora `role=receipt` + `is_default=1`, no con `system_settings`.
- Solo puede haber una impresora receipt marcada como default a la vez.
- Instalaciones existentes con config legacy preservan su configuración (migración idempotente).
- Los labels del `PrinterSettingsPanel` están i18n-izados en los 5 locales.
- Toda la suite de tests pasa (`bun run test`, `bun run test:dom`, `bun run lint`).