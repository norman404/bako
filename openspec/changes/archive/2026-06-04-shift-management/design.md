# Design: Shift Management (Apertura y Cierre de Turnos)

## Technical Approach

Add a new vertical `shift-reports` module following the project's Clean Architecture conventions. A `shifts` table tracks a single active shift; orders created while the feature flag is ON receive the active `shiftId`. Closing a shift aggregates its associated orders + payments on-the-fly (no denormalized totals in the DB). UI controls live in the App header and a settings tab registered via the module manifest. When the flag is OFF the app behaves exactly as before.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DB schema for shifts | `shifts(id, openedAt, closedAt, status)` + `orders.shift_id` nullable FK | Aligns with proposal. `status` makes active/closed explicit. No denormalized `totalCash/totalCard` to avoid drift. |
| Report generation | Aggregate orders + payments at query time via JOIN | Guarantees consistency. Shift report use-case queries `orders` + `payments` by `shift_id`. |
| Checkout blocking | UI-side guard in `App.tsx` before opening checkout | Keeps `checkout` module agnostic of `shift-reports`. `App.tsx` already orchestrates feature flags and stores. |
| Shift button placement | `App.tsx` header next to Settings/Cart buttons | Proposal says "header". Keeps it always visible and easy to access. |
| Settings tab for history | Registered via `manifest.ts` with `flagKey` | Follows the existing registry pattern. `SettingsModal` never imports `shift-reports` directly. |
| i18n namespace | `shift` for all shift labels; `settings` namespace for the flag label/description | Matches current multi-namespace pattern. Keeps translations co-located by domain. |
| Use-case validation | `open-shift` validates no active shift; `close-shift` validates active shift exists | Business rules belong in domain/use-cases. UI only prevents calling them in invalid states. |

## Data Flow

```
App.tsx
  ├─ reads useActiveShift() ──→ ShiftRepository.getActive()
  ├─ ShiftButton ──→ useOpenShift / useCloseShift ──→ shift use-cases ──→ ShiftRepository
  ├─ openCheckout() ──► checks activeShift + flag ──► CheckoutModal
  │                        └─ passes shiftId in CreateOrderInput
  │                           └─ orderDrizzleRepository.createOrder()
  │                              └─ inserts orders.shift_id
  └─ SettingsModal
       └─ ShiftHistoryPanel (via manifest registry)
            └─ useShiftHistory / useShiftReport
                 └─ ShiftRepository
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/migrations/0012_shifts.sql` | Create | `shifts` table + `orders.shift_id` FK + indices |
| `src-tauri/src/lib.rs` | Modify | Register migration `version: 12` |
| `src/shared/db/schema.ts` | Modify | Add `shifts` table schema and `shiftId` on `orders`; export row/insert types |
| `src/modules/checkout/domain/order.ts` | Modify | Add `shiftId?: string \| null` to `CheckoutOrder` and `CreateOrderInput` |
| `src/modules/checkout/persistence/order-drizzle.repository.ts` | Modify | Accept `shiftId` in normalized input and persist `shift_id` during insert |
| `src/modules/feature-flags/store/feature-flags-store.ts` | Modify | Add `shift_management_enabled: false` to `DEFAULT_FLAGS` |
| `src/modules/settings/components/FeatureFlagsPanel.tsx` | Modify | Add `shift` module config with `shift_management_enabled` flag |
| `src/modules/shift-reports/domain/shift.ts` | Create | Types: `Shift`, `ShiftStatus`, `ShiftReport` |
| `src/modules/shift-reports/domain/errors.ts` | Create | `ShiftAlreadyActiveError`, `NoActiveShiftError` |
| `src/modules/shift-reports/domain/ports.ts` | Create | `ShiftRepository` interface |
| `src/modules/shift-reports/use-cases/open-shift.ts` | Create | Opens shift; rejects if one already active |
| `src/modules/shift-reports/use-cases/close-shift.ts` | Create | Closes active shift; rejects if none |
| `src/modules/shift-reports/use-cases/get-active-shift.ts` | Create | Returns active shift or null |
| `src/modules/shift-reports/use-cases/list-shift-history.ts` | Create | Lists all shifts with order totals/counts |
| `src/modules/shift-reports/use-cases/get-shift-report.ts` | Create | Builds `ShiftReport` from orders + payments |
| `src/modules/shift-reports/persistence/shift-drizzle.repository.ts` | Create | Drizzle implementation of `ShiftRepository` |
| `src/modules/shift-reports/hooks/use-active-shift.ts` | Create | React Query hook for active shift |
| `src/modules/shift-reports/hooks/use-open-shift.ts` | Create | `useMutation` for opening |
| `src/modules/shift-reports/hooks/use-close-shift.ts` | Create | `useMutation` for closing; onSuccess shows report modal |
| `src/modules/shift-reports/hooks/use-shift-history.ts` | Create | React Query hook for history list |
| `src/modules/shift-reports/hooks/use-shift-report.ts` | Create | React Query hook for individual report |
| `src/modules/shift-reports/components/ShiftButton.tsx` | Create | Header button toggles open/close based on active shift |
| `src/modules/shift-reports/components/ShiftReportModal.tsx` | Create | Displays `ShiftReport` data |
| `src/modules/shift-reports/components/ShiftHistoryPanel.tsx` | Create | Lists shifts; clicking one opens report modal |
| `src/modules/shift-reports/manifest.ts` | Create | `ModuleManifest` with `flagKey` and `settingsPanel` |
| `src/modules/shift-reports/index.ts` | Create | Public API exports |
| `src/app/App.tsx` | Modify | Conditionally render `<ShiftButton />`; guard `openCheckout` when flag ON and no active shift |
| `src/app/module-registry.ts` | Modify | Import and add `shiftReportsManifest` |

## Interfaces / Contracts

### ShiftRepository

```typescript
// modules/shift-reports/domain/ports.ts
export interface ShiftRepository {
  openShift(): ResultAsync<Shift, ShiftPersistenceError>;
  closeShift(shiftId: string): ResultAsync<Shift, ShiftPersistenceError>;
  getActive(): ResultAsync<Shift | null, ShiftPersistenceError>;
  listHistory(): ResultAsync<ShiftHistoryItem[], ShiftPersistenceError>;
  getReport(shiftId: string): ResultAsync<ShiftReport, ShiftPersistenceError>;
}
```

### Domain Types

```typescript
// modules/shift-reports/domain/shift.ts
export type ShiftStatus = "active" | "closed";

export interface Shift {
  id: string;
  openedAt: Date;
  closedAt: Date | null;
  status: ShiftStatus;
}

export interface ShiftReport {
  shiftId: string;
  openedAt: Date;
  closedAt: Date | null;
  totalOrders: number;
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
}
```

### Checkout Order Extension

```typescript
// modules/checkout/domain/order.ts
export interface CreateOrderInput {
  // ...existing fields
  shiftId?: string | null;
}

export interface CheckoutOrder {
  // ...existing fields
  shiftId: string | null;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `open-shift`, `close-shift`, `get-shift-report` use-cases | Mock `ShiftRepository` with `vitest`; assert ResultAsync success/error paths |
| Unit | `ShiftRepository` (Drizzle) | Test against in-memory or test SQLite via Drizzle if available; otherwise mocked DB client |
| DOM | `ShiftButton`, `ShiftReportModal`, `ShiftHistoryPanel` | `@testing-library/react` in `.dom.spec.tsx`; mock hooks with predictable data |
| Integration | `App.tsx` checkout guard | Verify `openCheckout` is blocked when flag ON + no active shift; ensure `CreateOrderInput` includes `shiftId` |
| Regression | Existing checkout tests | Run full suite; ensure `shiftId` optional/null does not break existing flows |

## Open Questions

- None — all proposal questions resolved by the decisions above.
