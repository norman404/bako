# Master Spec: Soporte de impresoras de etiquetas TSPL (BEEPRT BY-480BT)

## Intent

Bako hoy solo habla ESC/POS, por lo que una impresora de etiquetas BEEPRT BY-480BT conectada por USB recibe bytes que ignora. Agregaremos soporte TSPL al módulo `printer` (comandas/etiquetas) sin tocar el flujo legacy de recibos/comandas ESC/POS.

## Scope

### In Scope
- Nuevo tipo de impresora `"label"` en el dominio del módulo `printer`.
- El comando Tauri existente `print_command` debe enrutar a TSPL cuando la impresora destino sea tipo `"label"`.
- Página de prueba TSPL en el panel de impresoras del módulo `printer`.
- Dimensiones de etiqueta configurables por impresora: ancho 40 mm, alto 30 mm, gap 2 mm por default.
- Tests unitarios del generador TSPL en Rust y tests de frontend para el nuevo tipo.

### Out of Scope
- Flujo legacy de impresora de recibo (`settings` → `checkout`) permanece ESC/POS.
- Bluetooth para esta versión.
- Códigos de barras; las comandas solo llevan texto.
- Otros lenguajes de etiquetas (ZPL, EPL, CPCL).
- Impresoras de etiquetas para tickets de cliente o productos; solo comandas.

## Capabilities

### New Capabilities
- `tspl-command-printing`: Generar y enviar comandos TSPL por USB para imprimir comandas en impresoras de etiquetas.
- `printer-label-type`: Registrar y configurar impresoras tipo `"label"` con ancho, alto y gap.

### Modified Capabilities
- `printer-management`: Extender `PrinterType` y validación para incluir `"label"` y ofrecer campos de configuración de etiqueta.
- `printer-test-flow`: El botón de prueba debe detectar `"label"` y enviar TSPL en vez de ESC/POS.
- `print-command-routing`: El adaptador `print-command` debe elegir ESC/POS o TSPL según el tipo de impresora destino.

## Approach

Separar protocolo (TSPL) de transporte (USB). Reutilizar los drivers USB existentes como tuberías de bytes crudos, agregar un nuevo módulo Rust `tspl/` con un builder de etiquetas, y modificar `print_command` para que, cuando la impresora destino sea `"label"`, genere TSPL en vez de ESC/POS. El flujo de recibo `print_ticket` queda intacto.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src-tauri/src/print/adapter.rs` | Modified | Separar transporte y protocolo; soportar `"label"` |
| `src-tauri/src/print/ticket.rs` | Modified | No tocar ESC/POS; añadir builder TSPL aparte |
| `src-tauri/src/print/tspl/` | New | Generador TSPL + tests unitarios |
| `src-tauri/src/commands.rs` | Modified | Nuevo comando `print_label` registrado |
| `src-tauri/src/lib.rs` | Modified | Registrar `print_label` en invoke_handler |
| `src-tauri/Cargo.toml` | Modified | Posible dependencia mínima o ninguna (builder propio) |
| `src/modules/printer/domain/printer.ts` | Modified | `PrinterType` incluye `"label"` |
| `src/modules/printer/persistence/printer-drizzle.repository.ts` | Modified | Validar `"label"` y campos de configuración |
| `src/modules/printer/components/admin/PrinterSettingsPanel.tsx` | Modified | UI para tipo `"label"` y campos de etiqueta |
| `src/modules/printer/adapters/test-printer.adapter.ts` | Modified | Ruta TSPL para pruebas de etiqueta |
| `src/shared/db/schema.ts` | Modified | Campos de configuración de etiqueta (ancho, alto, gap, densidad) |
| `src-tauri/migrations/*.sql` | New | Migración para nuevos campos |
| `src/shared/i18n/locales/*` | Modified | Nuevas keys en todos los locales |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| BY-480BT interpreta TSPL con dialecto propio | Med | Hacer configurable el dialecto y probar manualmente con el equipo real |
| Endpoint USB diferente al esperado por `escpos` | Med | Inspeccionar descriptores USB y permitir override de endpoint/interface |
| "label" rompe filas `usb`/`network` existentes | Low | Validar en tests de regresión; nunca cambiar tipos legacy |
| Nuevos campos de etiqueta no propagan a todos los locales | Low | Guard `locale-completeness.spec.ts` obliga a sincronizar keys |
| Sin prueba automática con impresora física | High | Tests de bytes + QA manual obligatorio antes de release |

## Rollback Plan

1. Revertir commits del cambio o desregistrar `print_label` en `src-tauri/src/lib.rs`.
2. Restaurar `PrinterType` y validación a `usb` / `network`.
3. Revertir migración de BD (solo si no hay datos de producción; si los hay, dejar columnas nullable y deprecarlas).
4. Ejecutar `bun run test` y `bun run test:dom` para confirmar que ESC/POS sigue intacto.

## Success Criteria

- [ ] El usuario puede configurar una impresora tipo `"label"` con ancho, alto, gap y densidad.
- [ ] El botón de prueba envía TSPL correcto y la BEEPRT BY-480BT imprime una etiqueta de prueba.
- [ ] Las impresoras `usb`/`network` existentes siguen funcionando con ESC/POS.
- [ ] Toda la suite de tests pasa (`bun run test` y `bun run test:dom`).

## Open Questions

> Estas preguntas DEBEN resolverse antes de avanzar a `sdd-spec`.

Resueltas — ver notas en el cuerpo del spec.
