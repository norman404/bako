# Master Spec: Shift Management (Apertura y Cierre de Turnos)

## Intent

Permitir a los operadores del POS iniciar y cerrar turnos de trabajo. Todas las órdenes creadas durante un turno activo se asocian a dicho turno. Al cerrarlo, el sistema genera un reporte con métricas de ventas totales y desglose por método de pago. La funcionalidad es opt-in vía feature flag para no afectar el flujo core.

## Scope

### In Scope
- Feature flag `shift_management_enabled` en settings.
- Botón de inicio de turno en la UI principal (visible solo cuando el flag está ON).
- Bloqueo de checkout con alerta si no hay turno activo y el flag está ON.
- Botón de cierre de turno en la misma ubicación del botón de inicio.
- Reporte de turno: fecha/hora inicio, fecha/hora cierre, órdenes vendidas, total vendido, desglose efectivo/tarjeta.
- Historial de turnos: lista con total y fecha, capacidad de ver reporte individual.
- Soporte multi-idioma en todas las nuevas etiquetas.

### Out of Scope
- Múltiples turnos activos simultáneamente.
- Edición de turnos cerrados.
- Reapertura de turnos cerrados.
- Asignación automática de órdenes históricas a un turno previo.

## Capabilities

### New Capabilities
- `shift-management-toggle`: Feature flag para habilitar/deshabilitar el sistema de turnos desde settings.
- `shift-open`: Iniciar un turno nuevo; validar que no exista otro activo.
- `shift-close`: Cerrar el turno activo actual; persistir fecha de cierre.
- `shift-report`: Generar y mostrar reporte de un turno específico (cerrado o activo).
- `shift-history`: Listar turnos previos con resumen; navegar al reporte de cada uno.

### Modified Capabilities
- `order-creation`: Asociar `shiftId` a la orden cuando se crea y el flag está activo; rechazar creación si no hay turno activo.
- `system-settings`: Agregar checkbox "Sistema de turnos" en el panel de features.

## Approach

1. **DB & Migración**: Nueva tabla `shifts` (id, openedAt, closedAt, totalCash, totalCard, status). Agregar `shiftId` nullable a `orders`.
2. **Domain**: Extender `checkout/domain/order.ts` con `shiftId` opcional. Crear entidad `Shift` y errores en un módulo de turnos.
3. **Persistence**: Repositorio de turnos con Drizzle; modificar `order-drizzle.repository.ts` para soportar `shiftId`.
4. **Feature Flag**: Agregar `shift_management_enabled: false` a `DEFAULT_FLAGS`.
5. **Hooks**: `useActiveShift`, `useOpenShift`, `useCloseShift`, `useShiftHistory`, `useShiftReport`.
6. **UI**: Botón en `App.tsx` (header o toolbar principal). Modal de reporte al cerrar. Panel de historial accesible desde settings o UI principal.
7. **Checkout**: Modificar `create-order` use-case para validar turno activo y asociar `shiftId`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/db/schema.ts` | Modified | Tabla `shifts`; columna `shift_id` en `orders` |
| `src-tauri/migrations/` | New | Nueva migración SQL para shifts + FK en orders |
| `src-tauri/src/lib.rs` | Modified | Registrar nueva migración |
| `src/modules/feature-flags/store/feature-flags-store.ts` | Modified | Agregar `shift_management_enabled` |
| `src/modules/checkout/domain/order.ts` | Modified | Agregar `shiftId` opcional |
| `src/modules/checkout/use-cases/create-order.ts` | Modified | Validar turno activo, asociar shiftId |
| `src/modules/checkout/persistence/order-drizzle.repository.ts` | Modified | Insertar `shift_id` al crear orden |
| `src/modules/shift-reports/` | New/Modified | Dominio, use-cases, persistence, hooks, componentes |
| `src/app/App.tsx` | Modified | Mostrar botón inicio/cierre de turno |
| `src/modules/settings/components/` | Modified | Checkbox de turnos en settings |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| Órdenes existentes sin `shift_id` al activar el flag | High | `shift_id` es nullable; no se requiere migración de datos históricos |
| UI de App.tsx se sobrecarga con más condicionales | Medium | Extraer sub-componente `ShiftButton` |
| Cierre de turno concurrente o sin ventas | Low | Validar que haya turno activo; reporte con totales en cero es válido |

## Rollback Plan

- Desactivar flag `shift_management_enabled` (default `false`).
- Revertir commits de migración y schema.
- Dejar columna `shift_id` en `orders` como nullable sin usar (no hay data loss).
- Eliminar módulo `shift-reports` si se creó nuevo.

## Success Criteria

- [ ] Usuario puede activar/desactivar flag de turnos en settings.
- [ ] Con flag ON, el botón de inicio de turno aparece en la UI principal.
- [ ] Sin turno activo y flag ON, intentar vender muestra alerta.
- [ ] Con turno activo, todas las órdenes se asocian al turno.
- [ ] Botón de cierre genera reporte correcto con totales y desglose.
- [ ] Historial muestra turnos pasados con total y fecha.
- [ ] La app funciona normalmente con flag OFF (sin cambios visibles).
- [ ] Todos los tests existentes pasan; nuevos tests unitarios y DOM pasan.

## Open Questions

> Estas preguntas DEBEN resolverse antes de avanzar a `sdd-spec`.

1. **Órdenes históricas**: ¿Qué hacemos con las órdenes existentes cuando se activa el flag por primera vez? ¿Dejan `shift_id` en `NULL` o se les asigna un turno retroactivo/default?
2. **Ubicación del botón**: ¿Dónde exactamente va el botón de inicio/cierre de turno? ¿Header de `App.tsx`, toolbar lateral, otra ubicación?
3. **Reporte al cerrar**: ¿Al cerrar turno se muestra el reporte inmediatamente en un modal, o solo se genera y se accede desde historial?
4. **Métodos de pago**: ¿El desglose es solo Efectivo/Tarjeta? El schema actual permite `method` libre (string). ¿Limitamos a esos dos o mostramos todos los métodos usados?
5. **Turno sin ventas**: ¿Se permite cerrar un turno que no tenga órdenes?
6. **Historial — dónde**: ¿El historial de turnos va en el modal de settings (como tab nuevo) o en la UI principal?
7. **I18n**: ¿Qué idiomas adicionales al español deben soportarse en esta iteración?
