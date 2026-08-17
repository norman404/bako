# Master Spec: Perfiles de impresora + enrutamiento por categoría

## Intent

Bako tiene dos modelos de impresora coexistiendo sin unificar. El ticket de venta lee `printer_type`/`printer_address` de `system_settings` (legacy single-printer), sin relación con la tabla `printers`. Las comandas usan la tabla `printers` con `role`, pero `build-kitchen-commands.ts` ignora el campo `categories.printer_id` que ya existe en BD y en la UI — duplica cada unidad a TODAS las impresoras con `role=kitchen` sin agrupar ni enrutar por categoría. El campo `categories.printer_id` se persiste y se configura en `CategorySettingsPanel.tsx`, pero es un feature muerto.

Este cambio conecta `categories.printer_id` al enrutamiento real de comandas (cada categoría enruta sus items a su impresora asignada, sin fallback), unifica el ticket de venta al modelo `printers` con un flag `is_default`, e i18n-iza el `PrinterSettingsPanel` (hoy con labels hardcoded en español).

## Scope

### In Scope
- Migración `0023_printer_is_default.sql`: columna `is_default` en `printers` + migración de datos legacy (`system_settings.printer_type/address` → impresora `role=receipt` con `is_default=1`).
- `Printer.isDefault` en dominio + validación (solo `role=receipt` puede ser default).
- Lógica "solo un default" en persistencia (transacción al actualizar/crear).
- Rewrite de `build-kitchen-commands.ts`: agrupar items por `category.printerId` y dirigir la comanda a la impresora asignada. Sin fallback — categoría sin impresora → no imprime.
- `print-ticket.adapter.ts`: dejar de leer `useSettingsStore`, recibir la impresora default receipt por parámetro.
- Wiring en `App.tsx`: obtener default receipt printer + categorías con `printerId` para el flujo de impresión.
- Toggle "Predeterminada" en `PrinterSettingsPanel.tsx` para printers con `role=receipt`.
- i18n-ización completa de `PrinterSettingsPanel.tsx` (labels, placeholders, estados vacíos).
- `printer/test/factories.ts` compartida (NO existe — cada spec duplica `buildPrinter`).
- Propagación de keys nuevas a los 4 locales restantes (guard `locale-completeness.spec.ts`).

### Out of Scope
- N:M categoría→impresora (se mantiene 1:1 con `categories.printer_id` existente).
- Bluetooth.
- Eliminación física de columnas legacy (`system_settings.printer_type/address` se deprecian, no se borran).
- `PrinterSettingsCard.tsx` legacy: se depreca, no se elimina en este cambio.
- Backend Rust: no se toca los comandos existentes (`print_ticket`, `print_command`, `test_printer`, `list_usb_printers`, `debug_tspl`).
- Nuevos comandos Tauri ni nuevos lenguajes de impresión (TSPL ya cubierto por `label-printer-tspl`).

## Capabilities

### New Capabilities
- `category-printer-routing`: Enrutar comandas de cocina según la impresora asignada a cada categoría, agrupando items por `category.printerId` y omitiendo items de categorías sin impresora.
- `printer-default-receipt`: Marcar exactamente una impresora `role=receipt` como predeterminada para el ticket de venta, con invariant de unicidad persistido en transacción.
- `printer-shared-factories`: Fixtures de dominio `printer` reutilizables para specs, following el patrón `(overrides: Partial<T> = {}) => ({...defaults, ...overrides})`.

### Modified Capabilities
- `printer-management`: Extender `Printer` con `isDefault`, validación de que solo `role=receipt` puede ser default, y toggle en `PrinterSettingsPanel`.
- `print-ticket-flow`: `print-ticket.adapter.ts` deja de leer `useSettingsStore` y recibe la impresora default receipt por parámetro desde `App.tsx`.
- `print-command-routing`: `build-kitchen-commands.ts` reescrito para enrutar por `category.printerId` en vez de broadcast a todas las kitchen printers.
- `printer-settings-panel-i18n`: Labels, placeholders y estados del panel pasan de hardcoded español a keys i18n sincronizadas en 5 locales.

## Approach

Conectar el campo `categories.printer_id` (ya persistido y editable en UI) al enrutamiento real de comandas, reescribiendo `build-kitchen-commands.ts` para agrupar cart lines por `category.printerId` y emitir un command por impresora asignada. Items de categorías sin impresora no generan comanda — sin fallback, decisión resuelta.

Unificar el ticket de venta al modelo `printers` añadiendo `is_default` (booleano) a la tabla `printers`, con invariant de unicidad enforced en persistencia vía transacción (al marcar una nueva, desmarcar la anterior). Solo impresoras con `role=receipt` pueden ser default. La migración `0023` mueve la config legacy de `system_settings.printer_type/address` a una fila `printers` con `role=receipt` + `is_default=1` de forma idempotente, preservando instalaciones existentes. Las columnas legacy se deprecian (no se borran).

`print-ticket.adapter.ts` se desacopla de `useSettingsStore` y recibe la impresora default receipt por parámetro; `App.tsx` la obtiene del repositorio y la inyecta. El backend Rust queda intacto — el comando `print_ticket` sigue recibiendo `printerType`/`printerAddress`, ahora provenientes de la fila `printers` en vez de `system_settings`.

i18n: migrar los labels hardcoded del `PrinterSettingsPanel.tsx` a keys en `settings.json` (y `errors.json` para errores), propagando a los 4 locales restantes según exige el guard `locale-completeness.spec.ts`.

Crear `printer/test/factories.ts` con la factory `buildPrinter` (dueño = módulo `printer`), importable por path directo desde otros specs, eliminando la duplicación actual.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src-tauri/migrations/0023_printer_is_default.sql` | New | Columna `is_default` en `printers` + migración de datos legacy |
| `src/shared/db/schema.ts` | Modified | Campo `isDefault` en la tabla `printers` |
| `src/modules/printer/domain/printer.ts` | Modified | `Printer.isDefault` + validación de rol default |
| `src/modules/printer/domain/ports.ts` | Modified | Contrato de repositorio si requiere garantizar unicidad de default |
| `src/modules/printer/persistence/printer-drizzle.repository.ts` | Modified | Validar rol default, transacción "solo un default", mapeo `isDefault` |
| `src/modules/printer/use-cases/*.ts` | Modified | `create-printer`/`update-printer` propagan `isDefault` y el invariant |
| `src/modules/printer/hooks/use-printers.ts` | Modified | Hooks CRUD exponen `isDefault` (mantienen hardcoded repo por ahora) |
| `src/modules/printer/components/admin/PrinterSettingsPanel.tsx` | Modified | Toggle "Predeterminada" para `role=receipt` + i18n-ización completa |
| `src/modules/printer/test/factories.ts` | New | Factory `buildPrinter` compartida |
| `src/modules/checkout/lib/build-kitchen-commands.ts` | Modified | Rewrite: agrupar por `category.printerId`, dirigir a impresora asignada, sin fallback |
| `src/modules/checkout/hooks/use-print-commands.ts` | Modified | Pasar categorías con `printerId` al builder |
| `src/modules/checkout/adapters/print-ticket.adapter.ts` | Modified | Recibir impresora default receipt por parámetro, no leer `useSettingsStore` |
| `src/app/App.tsx` | Modified | Wiring: obtener default receipt printer + categorías con `printerId` |
| `src/shared/i18n/locales/{es-MX,en-US,es-AR,es-ES,pt-BR}/settings.json` | Modified | Nuevas keys de printer i18n-izadas |
| `src/shared/i18n/locales/{...}/errors.json` | Modified | Nuevas keys de error de impresora si aplica |
| `src/modules/menu/domain/category.ts` | Unchanged | `printerId` ya existe — solo se consume, no se modifica |
| `src/modules/settings/components/PrinterSettingsCard.tsx` | Deprecated | Se depreca, no se elimina |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migración de datos legacy rompe config de instalaciones existentes | Med | Migración idempotente: solo crea fila `printers` si no existe receipt default; columnas legacy se deprecian sin borrar |
| Invariant "solo un default" se viola por race condition en hooks | Low | Transacción en persistencia que desmarca la anterior al marcar nueva; tests de concurrencia del invariant |
| Items de categorías sin impresora dejan de imprimirse sin aviso | Med | Decisión resuelta (sin fallback); validar con QA que `CategorySettingsPanel` ya expone la asignación y documentar el comportamiento |
| `build-kitchen-commands.ts` rewrite rompe comandas existentes | Med | Tests de regresión del agrupamiento antes del rewrite; mantener firma del comando `print_command` intacta |
| i18n keys no propagan a los 4 locales y rompen el guard | Low | Guard `locale-completeness.spec.ts` obliga sincronización; agregar keys en la misma tanda |
| `use-printers.ts` sigue hardcodeando `printerDrizzleRepository` (sin DI) | High | Aceptado como deuda conocida — no es objetivo de este cambio; documentar para futuro |
| No hay tests previos de persistencia/hooks/componente de printer | Med | Crear `printer/test/factories.ts` primero y cubrir el invariant de default + routing en TDD |

## Rollback Plan

1. Revertir commits del cambio.
2. Revertir migración `0023` solo si no hay datos de producción; si los hay, dejar `is_default` nullable y deprecarla (no borrar la columna — rompe checksum de Tauri).
3. Restaurar `build-kitchen-commands.ts` al broadcast por `role=kitchen`.
4. Restaurar `print-ticket.adapter.ts` para leer `useSettingsStore` de nuevo.
5. Restaurar labels hardcoded de `PrinterSettingsPanel.tsx` (o conservar las keys i18n — son aditivas y no rompen).
6. Ejecutar `bun run test`, `bun run test:dom` y `bun run lint` para confirmar que el flujo legacy queda intacto.

## Success Criteria

- [ ] Una categoría con impresora asignada enruta sus comandas a ESA impresora, no a todas las kitchen.
- [ ] Una categoría sin impresora asignada no genera comanda para sus items.
- [ ] El ticket de venta se imprime con la impresora `role=receipt` + `is_default=1`, no con `system_settings`.
- [ ] Solo puede haber una impresora receipt marcada como default a la vez (invariant persistido en transacción).
- [ ] Instalaciones existentes con config legacy preservan su configuración (migración `0023` idempotente).
- [ ] Los labels del `PrinterSettingsPanel` están i18n-izados en los 5 locales.
- [ ] `printer/test/factories.ts` existe y los specs dejan de duplicar `buildPrinter`.
- [ ] Toda la suite de tests pasa (`bun run test`, `bun run test:dom`, `bun run lint`).

## Open Questions

Resueltas — ver decisiones en `PRD.md`.