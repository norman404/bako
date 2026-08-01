# Tasks: Shift Cash Management

## Phase 1: Foundation (migración + schema + domain)

- [x] 1.1 Crear `src-tauri/migrations/0026_cash_management.sql` — ALTER shifts (opening_cash, counted_cash, cash_difference) + CREATE cash_movements table + index
- [x] 1.2 Registrar migración version 26 en `src-tauri/src/lib.rs`
- [x] 1.3 Modificar `src/shared/db/schema.ts` — agregar columnas a `shifts` + definir tabla `cashMovements` + tipos `CashMovementRow`/`CashMovementInsert`
- [x] 1.4 Modificar `src/modules/shift-reports/domain/shift.ts` — agregar tipos `CashMovement`, `CashMovementType`, `CashMovementInput`, `UpdateCashMovementInput`; extender `Shift` (openingCash, countedCash, cashDifference), `ShiftReport` (openingCash, cashMovementsIn/Out, expectedCash, countedCash, cashDifference, cashMovements[]), `ShiftHistoryItem` (openingCash, cashDifference)
- [x] 1.5 Modificar `src/modules/shift-reports/domain/errors.ts` — agregar códigos `invalidOpeningCash`, `invalidCountedCash`, `invalidCashMovement`, `cashMovementNotFound`
- [x] 1.6 Modificar `src/modules/shift-reports/domain/ports.ts` — cambiar firma `openShift(openingCash)`, `closeShift(shiftId, countedCash)` agregar `addCashMovement`, `updateCashMovement`, `deleteCashMovement`, `listCashMovements`
- [x] 1.7 RED: Escribir `domain/shift.spec.ts` — verificar tipos nuevos aceptan valores válidos y rechazan inválidos
- [x] 1.8 GREEN+REFACTOR: Confirmar que compila

## Phase 2: Use-cases

- [ ] 2.1 RED: Escribir `use-cases/open-shift.spec.ts` — agregar tests: rechaza openingCash <= 0 (invalidOpeningCash), acepta > 0
- [ ] 2.2 GREEN: Modificar `use-cases/open-shift.ts` — recibir `openingCash: number`, validar `> 0` antes de delegar al repo
- [ ] 2.3 RED: Escribir `use-cases/close-shift.spec.ts` — agregar tests: rechaza countedCash < 0 (invalidCountedCash), acepta >= 0
- [ ] 2.4 GREEN: Modificar `use-cases/close-shift.ts` — recibir `countedCash: number`, validar `>= 0`
- [ ] 2.5 RED: Escribir `use-cases/add-cash-movement.spec.ts` — valida amount > 0, reason >= 3 chars, shift activo, forwardea errores
- [ ] 2.6 GREEN: Crear `use-cases/add-cash-movement.ts` — validaciones + delegar al repo
- [ ] 2.7 RED: Escribir `use-cases/update-cash-movement.spec.ts` — valida, no cambia type, shift activo, forwardea errores
- [ ] 2.8 GREEN: Crear `use-cases/update-cash-movement.ts` — UPDATE amount/reason, preservar type
- [ ] 2.9 RED: Escribir `use-cases/delete-cash-movement.spec.ts` — valida shift activo, existencia (cashMovementNotFound), forwardea errores
- [ ] 2.10 GREEN: Crear `use-cases/delete-cash-movement.ts`
- [ ] 2.11 RED: Escribir `use-cases/list-cash-movements.spec.ts` — delega al repo, retorna lista
- [ ] 2.12 GREEN: Crear `use-cases/list-cash-movements.ts`
- [ ] 2.13 REFACTOR: Limpiar use-cases, confirmar todos verdes

## Phase 3: Persistence

- [ ] 3.1 RED: Escribir `persistence/shift-drizzle.repository.spec.ts` — tests nuevos: openShift inserta opening_cash; closeShift calcula expected/difference (3 escenarios: exacto, surplus, shortage); getActive retorna openingCash; getReport incluye cashMovements + expectedCash; listHistory incluye openingCash; addCashMovement inserta; updateCashMovement preserva type; deleteCashMovement verifica shift activo; shifts legacy con openingCash null coalescen a 0
- [ ] 3.2 GREEN: Modificar `persistence/shift-drizzle.repository.ts` — `openShift` INSERT con opening_cash; `closeShift` (query cash sales + movements, calcula expected/difference, UPDATE); `getActive` SELECT con opening_cash; `getReport` SELECT cash_movements + cálculo expected; `listHistory` SELECT con opening_cash; implementar `addCashMovement`, `updateCashMovement`, `deleteCashMovement`, `listCashMovements`
- [ ] 3.3 REFACTOR: Limpiar, confirmar verdes

## Phase 4: Hooks

- [ ] 4.1 RED: Escribir `hooks/use-shift-reports.dom.spec.tsx` — tests: useOpenShift llama con openingCash, useCloseShift llama con {shiftId, countedCash}, useCashMovements retorna lista, useAddCashMovement invalida queries, useUpdateCashMovement, useDeleteCashMovement
- [ ] 4.2 GREEN: Modificar `hooks/use-shift-reports.ts` — cambiar `useOpenShift.mutate(openingCash)`, `useCloseShift.mutate({shiftId, countedCash})`; agregar `SHIFT_QUERY_KEYS.movements`; crear `useCashMovements(shiftId)`, `useAddCashMovement`, `useUpdateCashMovement`, `useDeleteCashMovement`
- [ ] 4.3 REFACTOR: Limpiar, confirmar verdes

## Phase 5a: Components — Apertura/Cierre (paralelo con 5b)

- [ ] 5a.1 RED: Escribir `components/OpenShiftDialog.dom.spec.tsx` — render input efectivo, validación > 0, disabled si inválido, confirma llama useOpenShift con centavos
- [ ] 5a.2 GREEN: Crear `components/OpenShiftDialog.tsx` — input numérico (parseo centavos), validación, botón confirmar
- [ ] 5a.3 RED: Escribir `components/CloseShiftDialog.dom.spec.tsx` — muestra breakdown (inicial+ventas+entradas-salidas=esperado), input conteo, descuadre en vivo (verde/rojo/amarillo), confirma llama useCloseShift
- [ ] 5a.4 GREEN: Crear `components/CloseShiftDialog.tsx` — breakdown + input + cálculo diferencia en vivo
- [ ] 5a.5 RED: Escribir `components/ShiftButton.dom.spec.tsx` — actualizar tests: click abrir abre OpenShiftDialog, click cerrar abre CloseShiftDialog (reemplaza diálogo simple)
- [ ] 5a.6 GREEN: Modificar `components/ShiftButton.tsx` — abrir abre OpenShiftDialog, cerrar abre CloseShiftDialog
- [ ] 5a.7 REFACTOR: Limpiar, confirmar verdes

## Phase 5b: Components — Movimientos (paralelo con 5a)

- [ ] 5b.1 RED: Escribir `components/CashMovementsDialog.dom.spec.tsx` — formulario (type SegmentedControl, amount input, reason input), validación amount > 0 y reason >= 3, lista movimientos, botón editar carga form, botón eliminar confirma, toasts success/error, resumen totales
- [ ] 5b.2 GREEN: Crear `components/CashMovementsDialog.tsx` — form + lista CRUD + resumen
- [ ] 5b.3 RED: Escribir `components/CashMovementsButton.dom.spec.tsx` — visible solo si turno activo, click abre CashMovementsDialog, hidden si no hay turno
- [ ] 5b.4 GREEN: Crear `components/CashMovementsButton.tsx` — botón condicional + dialog
- [ ] 5b.5 REFACTOR: Limpiar, confirmar verdes

## Phase 6: Reporte + Reimpresión

- [ ] 6.1 RED: Escribir `components/ShiftReportView.dom.spec.tsx` — agregar tests: sección "Resumen de efectivo" muestra openingCash, cashMovementsIn, cashMovementsOut, expectedCash, countedCash, cashDifference; badge color por signo de difference; cashMovements list visible
- [ ] 6.2 GREEN: Modificar `components/ShiftReportView.tsx` — agregar sección cash summary
- [ ] 6.3 RED: Escribir `lib/reprint-shift-report.spec.ts` — agregar tests: ticket incluye líneas efectivo (opening, expected, counted, difference)
- [ ] 6.4 GREEN: Modificar `lib/reprint-shift-report.ts` — agregar líneas de efectivo al payload
- [ ] 6.5 REFACTOR: Limpiar, confirmar verdes

## Phase 7: i18n + Wiring

- [ ] 7.1 Agregar ~30 keys nuevas a `src/shared/i18n/locales/es-MX/shift.json` (openingCash, expectedCash, countedCash, cashDifference, cashMovements, etc.)
- [ ] 7.2 Propagar keys a `es-AR`, `en-US`, `es-ES`, `pt-BR` (traducidas)
- [ ] 7.3 Modificar `src/app/App.tsx` — renderizar `CashMovementsButton` junto a `ShiftButton` en header, condicionado a `shiftManagementEnabled && activeShift`
- [ ] 7.4 Actualizar `src/modules/shift-reports/index.ts` — exportar nuevos componentes y hooks
- [ ] 7.5 Verificar `locale-completeness.spec.ts` no rompe (keys planas fuera del sub-namespace `errors` no validan paridad)
- [ ] 7.6 Run completo: `bun run test` + `bun run test:dom` — todo verde