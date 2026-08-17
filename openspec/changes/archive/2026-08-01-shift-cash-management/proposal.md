# Master Spec: Shift Cash Management

## Intent

El POS hoy abre y cierra turnos sin trackear el efectivo físico. Las ventas se registran pero no hay forma de saber cuánto dinero **debería** haber en caja al cerrar, ni de registrar entradas/salidas de dinero que no son ventas. Este change agrega gestión de efectivo al ciclo de turno: efectivo inicial obligatorio al abrir, movimientos de caja (entradas y salidas) durante el turno, y conteo de caja + cálculo de descuadre al cerrar.

## Scope

### In Scope
- Efectivo inicial obligatorio al abrir turno (`openingCash > 0`, en centavos)
- Movimientos de caja durante el turno: entradas (`income`) y salidas (`expense`)
- CRUD de movimientos: crear, editar (monto + motivo), eliminar, listar
- Al cerrar: registrar efectivo contado real (`countedCash >= 0`)
- Cálculo de efectivo esperado y descuadre al cerrar
- Reporte de turno extendido con sección de efectivo (inicial, ventas, movimientos, esperado, contado, descuadre)
- Botón de movimientos en pantalla principal durante turno activo
- Reimpresión de reporte con líneas de efectivo

### Out of Scope
- Denominaciones de bilientes/monedas (conteo por denominación)
- Arqueo parcial durante el turno (solo al cerrar)
- Multi-caja / múltiples fondos
- Aprobación de supervisor para descuadres grandes
- Integración con sistema contable externo
- Reportes de efectivo históricos跨-turno (dashboard de caja)

## Capabilities

### New Capabilities
- `cash-movements`: Registro de entradas y salidas de dinero durante un turno activo. CRUD completo con validación de monto (> 0) y motivo (mín 3 caracteres).

### Modified Capabilities
- `shift-core`: El requisito **Open Shift** ahora exige `openingCash > 0`. El requisito **Close Shift** ahora recibe `countedCash` y calcula `cashDifference` contra el efectivo esperado.
- `shift-report`: El reporte ahora incluye `openingCash`, `cashMovementsIn`, `cashMovementsOut`, `expectedCash`, `countedCash`, `cashDifference`, y la lista de `cashMovements`.

## Approach

Todo se gatea detrás del flag existente `shift_management_enabled` (sin flag nueva). Migración `0026` agrega 3 columnas a `shifts` (`opening_cash`, `counted_cash`, `cash_difference`) + tabla nueva `cash_movements`. Clean Architecture: domain → ports → use-cases → persistence → hooks → components. Dinero en centavos (ADR-0001). UI: `OpenShiftDialog` (efectivo inicial), `CloseShiftDialog` (conteo + descuadre en vivo), `CashMovementsButton` + `CashMovementsDialog` (CRUD durante el turno).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src-tauri/migrations/0026_cash_management.sql` | New | ALTER shifts + CREATE cash_movements |
| `src-tauri/src/lib.rs` | Modified | Registrar migración 26 |
| `src/shared/db/schema.ts` | Modified | Columnas de shifts + tabla cashMovements |
| `src/modules/shift-reports/domain/shift.ts` | Modified | Tipos Shift, ShiftReport, ShiftHistoryItem + CashMovement |
| `src/modules/shift-reports/domain/ports.ts` | Modified | Firma de openShift, closeShift + 3 métodos nuevos |
| `src/modules/shift-reports/domain/errors.ts` | Modified | Nuevos códigos de error |
| `src/modules/shift-reports/use-cases/` | Modified | open-shift, close-shift + 3 nuevos (add, update, delete movement) |
| `src/modules/shift-reports/persistence/shift-drizzle.repository.ts` | Modified | openShift, closeShift, getReport, listHistory + 3 métodos |
| `src/modules/shift-reports/hooks/use-shift-reports.ts` | Modified | Hooks existentes + 4 nuevos |
| `src/modules/shift-reports/components/ShiftButton.tsx` | Modified | Abre OpenShiftDialog en vez de mutate directo |
| `src/modules/shift-reports/components/OpenShiftDialog.tsx` | New | Input de efectivo inicial |
| `src/modules/shift-reports/components/CloseShiftDialog.tsx` | New | Conteo + descuadre en vivo |
| `src/modules/shift-reports/components/CashMovementsButton.tsx` | New | Botón en header |
| `src/modules/shift-reports/components/CashMovementsDialog.tsx` | New | CRUD de movimientos |
| `src/modules/shift-reports/components/ShiftReportView.tsx` | Modified | Sección de efectivo |
| `src/modules/shift-reports/lib/reprint-shift-report.ts` | Modified | Líneas de efectivo en ticket |
| `src/shared/i18n/locales/*/shift.json` | Modified | 25+ keys nuevas en 5 locales |
| `src/app/App.tsx` | Modified | Wiring de CashMovementsButton |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Shifts existentes (sin openingCash) rompen al leer | Med | Columnas nullable en BD; domain las hace optional/0 para shifts legacy |
| Cálculo de expectedCash sea incorrecto | Med | Tests de persistencia cubren la fórmula completa |
| Edición de movimiento de turno cerrado | Baja | Use-case valida que el shift esté active antes de editar/eliminar |
| Descuadre negativo confunda al cajero | Baja | UI con colores: verde (0), rojo (negativo), amarillo (positivo) |

## Rollback Plan

1. Revertir migración 26 (DROP TABLE cash_movements; ALTER TABLE shifts DROP COLUMN opening_cash/counted_cash/cash_difference) — aunque SQLite no soporta DROP COLUMN en <3.35, Tauri usa SQLite moderno.
2. Revertir todos los cambios de código (git revert del commit del change).
3. Los shifts existentes quedan sin campos de efectivo — funcionalidad vuelve al estado pre-change.

## Success Criteria

- [ ] Al abrir turno, el cajero DEBE ingresar efectivo inicial > 0
- [ ] Durante el turno, el cajero puede registrar/editar/eliminar entradas y salidas
- [ ] Al cerrar turno, el sistema muestra esperado vs contado y calcula el descuadre
- [ ] El reporte de turno (modal + historial) muestra la sección de efectivo completa
- [ ] La reimpresión del reporte incluye las líneas de efectivo
- [ ] Shifts existentes (pre-migración) no rompen la app
- [ ] Suite de tests en verde con TDD estricto (RED → GREEN → REFACTOR)
- [ ] i18n propagado a los 5 locales

## Open Questions

None — El PRD fue clarificado con el usuario. Todas las decisiones de alcance están resueltas:

- Descuadre: registrar conteo real + calcular diferencia ✓
- Movimientos: entradas y salidas ✓
- Efectivo inicial: obligatorio, > 0 ✓
- Acceso a movimientos: botón en pantalla principal ✓
- Editar movimientos: permitido (monto + motivo) ✓
- Motivo: obligatorio, mínimo 3 caracteres ✓