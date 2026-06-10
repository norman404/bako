# Shift Reports Module

Sistema de apertura y cierre de turnos de venta.

## Capabilities

- Abrir un turno nuevo (rechaza si ya hay uno activo)
- Cerrar turno activo (genera reporte inmediato)
- Ver reporte de turno: órdenes, total, desglose efectivo/tarjeta
- Historial de turnos con totales

## Arquitectura

```
domain/       ← Tipos Shift, ShiftReport, ShiftHistoryItem + errors + ports
use-cases/    ← openShift, closeShift, getActiveShift, listShiftHistory, getShiftReport
persistence/  ← shift-drizzle.repository.ts (Drizzle SQLite)
hooks/        ← React Query hooks (useActiveShift, useOpenShift, useCloseShift, useShiftHistory, useShiftReport)
components/   ← ShiftButton (header UI), ShiftReportModal, ShiftHistoryPanel
```

## Registro

- `manifest.ts` registra `ShiftHistoryPanel` como tab de Settings vía `ModuleManifest`
- Flag: `shift_management_enabled` en feature flags

## Dependencias

- `checkout` (para asociar `shiftId` a órdenes)
- `settings` (registry de tabs)
- `feature-flags` (para mostrar/ocultar)
