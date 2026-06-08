## Apply Progress — Shift Management

### Phase 1: Foundation — DB, Schema, Feature Flag (GREEN)
- 1.1 Migration `0012_shifts.sql` ✅
- 1.2 Register migration in `lib.rs` ✅
- 1.3 Schema `shifts` table + `orders.shiftId` ✅
- 1.4 Feature flag `shift_management_enabled` in DEFAULT_FLAGS ✅
- 1.5 FeatureFlagsPanel checkbox ✅
- 1.6 i18n `shift` namespace (5 locales) ✅

### Phase 2: Shift Domain + Persistence (GREEN)
- 2.1 Domain types `Shift`, `ShiftReport`, `ShiftHistoryItem` ✅
- 2.2 Errors: `ShiftPersistenceError`, `ShiftAlreadyActiveError`, `NoActiveShiftError` ✅
- 2.3 `ShiftRepository` interface ✅
- 2.4 Drizzle repository ✅

### Phase 3: Use-Cases (RED→GREEN)
- 3.1 **RED**: `open-shift.spec.ts` fails (import error, no implementation) ❌
- 3.2 **GREEN**: Implement `open-shift.ts` → tests pass ✅
- 3.3 **RED**: `close-shift.spec.ts` fails (import error, no implementation) ❌
- 3.4 **GREEN**: Implement `close-shift.ts` → tests pass ✅
- 3.5 **RED**: `get-active-shift.spec.ts` fails ❌
- 3.6 **GREEN**: Implement `get-active-shift.ts` → tests pass ✅
- 3.7 **RED**: `list-shift-history.spec.ts` fails ❌
- 3.8 **GREEN**: Implement `list-shift-history.ts` → tests pass ✅
- 3.9 **RED**: `get-shift-report.spec.ts` fails ❌
- 3.10 **GREEN**: Implement `get-shift-report.ts` → tests pass ✅
- 3.11 Update checkout domain for `shiftId` ✅
- 3.14 Update order repo to persist `shift_id` ✅

### Phase 4: React Hooks (GREEN)
- 4.1–4.5 `use-shift-reports.ts` with all hooks ✅

### Phase 5: UI Components (RED→GREEN)
- 5.1 **RED**: `ShiftButton.dom.spec.tsx` fails (component doesn't exist) ❌
- 5.1 **GREEN**: Implement `ShiftButton.tsx` → tests pass ✅
- 5.2 Implement `ShiftReportModal.tsx` ✅
- 5.3 **RED**: `ShiftHistoryPanel.dom.spec.tsx` fails ❌
- 5.3 **GREEN**: Implement `ShiftHistoryPanel.tsx` → tests pass ✅
- 5.4 Manifest with `flagKey` ✅
- 5.5 Registry update ✅
- 5.6 `App.tsx` integration (guard + button + shiftId injection) ✅

### Phase 6: Verification (GREEN)
- 6.1 Unit tests: 128/128 ✅
- 6.2 DOM tests: 7/7 new pass; 2 pre-existing checkout failures confirmed before change ✅
- 6.5 TypeScript: 0 errors ✅

### Fixes applied during verify
- [x] Added `ShiftAlreadyActiveError` and `NoActiveShiftError` to domain/errors.ts
- [x] Updated `open-shift.ts` to use `ShiftAlreadyActiveError`
- [x] Updated `close-shift.spec.ts` to test `NoActiveShiftError`
