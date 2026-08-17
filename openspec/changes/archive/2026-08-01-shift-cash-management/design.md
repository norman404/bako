# Design: Shift Cash Management

## Technical Approach

Extender el módulo `shift-reports` con gestión de efectivo. Todo gateado detrás de `shift_management_enabled` existente. Clean Architecture completa: domain → ports → use-cases → persistence → hooks → components. Dinero en centavos (ADR-0001). Migración SQLite `0026` agrega 3 columnas a `shifts` + tabla `cash_movements`.

## Architecture Decisions

### Decision: Cálculo de expectedCash en closeShift (persistence), no en use-case

**Choice**: El cálculo de `expectedCash` y `cashDifference` vive en `persistence/shift-drizzle.repository.ts` dentro de `closeShift`, porque necesita queryar ventas efectivo + movimientos del shift en una transacción.
**Alternatives**: Calcular en el use-case (requeriría métodos extra en el port para obtener cashSales + movimientos antes de cerrar — más complejo, más round-trips).
**Rationale**: Una sola transacción atómica: lee cash sales, lee movimientos, calcula expected, UPDATE shift. Consistencia garantizada.

### Decision: Movimientos — tabla dedicada, no columnas en shifts

**Choice**: Tabla `cash_movements` con FK lógica a `shifts` (sin FK constraint, siguiendo el patrón de `orders.shift_id` que es TEXT sin FK por "legacy compatibility").
**Alternatives**: Array JSON en shifts (SQLite soporta JSON1, pero query individual por movimiento es imposible).
**Rationale**: CRUD completo de movimientos requiere queries por id — tabla dedicada es la única opción. Sin FK constraint sigue el patrón existente.

### Decision: Edición de movimientos — UPDATE in-place, no delete+create

**Choice**: `updateCashMovement` hace UPDATE del amount y reason, preservando type y createdAt.
**Alternatives**: Delete + create (pierde createdAt y id, rompe auditoría).
**Rationale**: El usuario pidió editar monto y motivo; type no es editable. In-place preserva auditoría.

### Decision: Shifts legacy — openingCash nullable en BD, 0 en domain

**Choice**: Columnas `opening_cash`, `counted_cash`, `cash_difference` son nullable en SQLite. El mapeo row→domain usa `?? 0` para `openingCash` y `?? null` para `countedCash`/`cashDifference`.
**Alternatives**: Migración con `DEFAULT 0` (mentira — shifts cerrados no tienen conteo).
**Rationale**: Shifts existentes pre-migración no tienen openingCash. Nullable + coalesce a 0 en domain evita romper la app.

### Decision: Sin flag nueva

**Choice**: Reusar `shift_management_enabled`. Si el flag está off, el flujo legacy (sin efectivo) se mantiene.
**Alternatives**: Flag `cash_management_enabled` separada.
**Rationale**: La gestión de efectivo es intrínseca al turno — no tiene sentido tener turnos sin efectivo si el flag de turnos está on.

## Data Flow

```
OpenShiftDialog ──→ useOpenShift(openingCash) ──→ openShift use-case
    │                                              │
    │                                         ShiftRepository.openShift(openingCash)
    │                                              │ INSERT shifts(id, opened_at, opening_cash, status='active')
    │
CashMovementsButton ──→ CashMovementsDialog
    │                        ├──→ useAddCashMovement ──→ addCashMovement use-case ──→ repo.addCashMovement
    │                        ├──→ useUpdateCashMovement ──→ updateCashMovement ──→ repo.updateCashMovement
    │                        ├──→ useDeleteCashMovement ──→ deleteCashMovement ──→ repo.deleteCashMovement
    │                        └──→ useCashMovements(shiftId) ──→ repo.listCashMovements
    │
CloseShiftDialog ──→ useCloseShift({ shiftId, countedCash })
    │                        ──→ closeShift use-case ──→ ShiftRepository.closeShift(shiftId, countedCash)
    │                                              │ 1. SELECT cash sales (orders JOIN payments WHERE shiftId AND method='cash' AND voidedAt IS NULL)
    │                                              │ 2. SELECT cash_movements WHERE shiftId (sum income, sum expense)
    │                                              │ 3. expected = openingCash + cashSales + income - expense
    │                                              │ 4. difference = countedCash - expected
    │                                              │ 5. UPDATE shifts SET closed_at, status='closed', counted_cash, cash_difference
    │
ShiftReportView ──→ useShiftReport(shiftId) ──→ getShiftReport ──→ repo.getReport
    │                                              │ SELECT shift + orders + payments + cash_movements
    │                                              │ Calcula expectedCash, cashMovementsIn/Out en memoria
    │
Reprint ──→ reprintShiftReport ──→ invoke("print_ticket") con líneas de efectivo
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/migrations/0026_cash_management.sql` | Create | ALTER shifts (3 cols) + CREATE cash_movements table |
| `src-tauri/src/lib.rs` | Modify | Registrar migración version 26 |
| `src/shared/db/schema.ts` | Modify | Columnas shifts + tabla cashMovements |
| `src/modules/shift-reports/domain/shift.ts` | Modify | Tipos: CashMovement, CashMovementInput, UpdateCashMovementInput + extender Shift, ShiftReport, ShiftHistoryItem |
| `src/modules/shift-reports/domain/errors.ts` | Modify | Nuevos códigos: invalidOpeningCash, invalidCountedCash, invalidCashMovement, cashMovementNotFound |
| `src/modules/shift-reports/domain/ports.ts` | Modify | openShift(openingCash), closeShift(shiftId, countedCash) + addCashMovement, updateCashMovement, deleteCashMovement, listCashMovements |
| `src/modules/shift-reports/use-cases/open-shift.ts` | Modify | Recibe openingCash, valida > 0 |
| `src/modules/shift-reports/use-cases/close-shift.ts` | Modify | Recibe countedCash, valida >= 0 |
| `src/modules/shift-reports/use-cases/add-cash-movement.ts` | Create | Valida amount > 0, reason >= 3 chars, shift activo |
| `src/modules/shift-reports/use-cases/update-cash-movement.ts` | Create | Valida, no cambia type, shift activo |
| `src/modules/shift-reports/use-cases/delete-cash-movement.ts` | Create | Valida shift activo, existencia |
| `src/modules/shift-reports/use-cases/list-cash-movements.ts` | Create | Delega al repo |
| `src/modules/shift-reports/persistence/shift-drizzle.repository.ts` | Modify | openShift, closeShift (cálculo), getReport, listHistory + 4 métodos nuevos |
| `src/modules/shift-reports/hooks/use-shift-reports.ts` | Modify | useOpenShift(openingCash), useCloseShift({shiftId, countedCash}) + 4 hooks nuevos |
| `src/modules/shift-reports/components/ShiftButton.tsx` | Modify | Abre OpenShiftDialog / CloseShiftDialog |
| `src/modules/shift-reports/components/OpenShiftDialog.tsx` | Create | Input efectivo inicial, validación > 0 |
| `src/modules/shift-reports/components/CloseShiftDialog.tsx` | Create | Breakdown + input conteo + descuadre en vivo |
| `src/modules/shift-reports/components/CashMovementsButton.tsx` | Create | Botón en header, visible si turno activo |
| `src/modules/shift-reports/components/CashMovementsDialog.tsx` | Create | Formulario + lista CRUD de movimientos |
| `src/modules/shift-reports/components/ShiftReportView.tsx` | Modify | Sección "Resumen de efectivo" |
| `src/modules/shift-reports/lib/reprint-shift-report.ts` | Modify | Líneas de efectivo en ticket impreso |
| `src/shared/i18n/locales/*/shift.json` | Modify | ~30 keys nuevas en 5 locales |
| `src/app/App.tsx` | Modify | Wiring CashMovementsButton en header |

## Interfaces / Contracts

### Domain — tipos nuevos

```typescript
type CashMovementType = "income" | "expense";

interface CashMovement {
  id: string;
  shiftId: string;
  type: CashMovementType;
  amount: number;      // centavos, > 0
  reason: string;      // >= 3 chars
  createdAt: Date;
}

interface CashMovementInput {
  type: CashMovementType;
  amount: number;
  reason: string;
}

interface UpdateCashMovementInput {
  amount?: number;
  reason?: string;
}
```

### Domain — modificaciones

```typescript
interface Shift {
  // ...existentes...
  openingCash: number;            // NUEVO — coalesce a 0 para legacy
  countedCash: number | null;     // NUEVO — null hasta cerrar
  cashDifference: number | null; // NUEVO — null hasta cerrar
}

interface ShiftReport {
  // ...existentes...
  openingCash: number;
  cashMovementsIn: number;
  cashMovementsOut: number;
  expectedCash: number;
  countedCash: number | null;
  cashDifference: number | null;
  cashMovements: CashMovement[];
}

interface ShiftHistoryItem {
  // ...existentes...
  openingCash: number;
  cashDifference: number | null;
}
```

### Ports — ShiftRepository

```typescript
interface ShiftRepository {
  openShift(openingCash: number): ResultAsync<Shift, ShiftPersistenceError>;
  closeShift(shiftId: string, countedCash: number): ResultAsync<Shift, ShiftPersistenceError>;
  getActive(): ResultAsync<Shift | null, ShiftPersistenceError>;
  listHistory(): ResultAsync<ShiftHistoryItem[], ShiftPersistenceError>;
  getReport(shiftId: string): ResultAsync<ShiftReport, ShiftPersistenceError>;
  getOrderDetail(orderId: string): ResultAsync<OrderDetail, ShiftPersistenceError>;
  voidOrder(orderId: string): ResultAsync<void, ShiftPersistenceError>;
  updateOrder(orderId: string, input: UpdateOrderInput): ResultAsync<OrderDetail, ShiftPersistenceError>;
  // NUEVOS:
  addCashMovement(shiftId: string, input: CashMovementInput): ResultAsync<CashMovement, ShiftPersistenceError>;
  updateCashMovement(id: string, input: UpdateCashMovementInput): ResultAsync<CashMovement, ShiftPersistenceError>;
  deleteCashMovement(id: string): ResultAsync<void, ShiftPersistenceError>;
  listCashMovements(shiftId: string): ResultAsync<CashMovement[], ShiftPersistenceError>;
}
```

### Migración SQL

```sql
ALTER TABLE shifts ADD COLUMN opening_cash INTEGER;
ALTER TABLE shifts ADD COLUMN counted_cash INTEGER;
ALTER TABLE shifts ADD COLUMN cash_difference INTEGER;

CREATE TABLE IF NOT EXISTS cash_movements (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cash_movements_shift_id ON cash_movements(shift_id);
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Domain | Tipos aceptan valores válidos, rechazan inválidos (TS compile-time) | `.spec.ts` |
| Use-cases | openShift rechaza openingCash <= 0; closeShift rechaza countedCash < 0; addCashMovement valida amount > 0 y reason >= 3; updateCashMovement no cambia type; deleteCashMovement valida shift activo; todos forwardean errores | `.spec.ts` con repo mock |
| Persistence | closeShift calcula expected/difference correctamente; getReport incluye cash movements; addCashMovement inserta correctamente; updateCashMovement preserva type; deleteCashMovement verifica shift activo; shifts legacy con openingCash null coalescen a 0 | `.spec.ts` con db mock (chain thenable) |
| Hooks | Mutations llaman use-case correcto, invalidan queries; useCashMovements retorna lista | `.dom.spec.tsx` con query client mock |
| Components | OpenShiftDialog valida input > 0; CloseShiftDialog muestra breakdown y descuadre en vivo; CashMovementsDialog CRUD completo (add, edit, delete, list); ShiftReportView muestra sección efectivo; toasts success/error | `.dom.spec.tsx` |

## Open Questions

None — todas las decisiones técnicas están resueltas.