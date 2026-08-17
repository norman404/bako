# Shift Reports Module

Sistema de apertura y cierre de turnos de venta.

## Capabilities

- Abrir un turno nuevo (rechaza si ya hay uno activo)
- Cerrar turno activo (genera reporte inmediato)
- Ver reporte de turno: órdenes, productos vendidos, total, desglose efectivo/tarjeta y listado de ventas
- Historial de turnos con totales
- Por cada orden del listado de ventas (mientras no esté anulada):
  - **Reimprimir ticket** — reobtiene el `OrderDetail` completo y lo reenvía a la impresora de tickets por defecto
  - **Editar pedido** — abre `EditOrderModal` para modificar cantidades, quitar productos o cambiar el método de pago
  - **Anular pedido** — marca la orden como anulada vía `VoidOrderConfirm`; una orden anulada queda en modo solo lectura y sus botones de acción se ocultan
  - **Reimprimir comanda** — permite elegir productos y cantidades de la orden para reenviar a cocina, ruteando por categoría de producto
- Los totales del turno (`totalSales`, `totalOrders`, `totalItems`, `cashTotal`, `cardTotal`) excluyen las órdenes anuladas

## Arquitectura

```
domain/       ← Tipos Shift, ShiftReport, ShiftHistoryItem, OrderDetail + errors + ports
use-cases/    ← openShift, closeShift, getActiveShift, listShiftHistory, getShiftReport, getOrderDetail, updateOrder, voidOrder
persistence/  ← shift-drizzle.repository.ts (Drizzle SQLite)
hooks/        ← React Query hooks (useActiveShift, useOpenShift, useCloseShift, useShiftHistory, useShiftReport, useOrderDetail, useFetchOrderDetail, useUpdateOrder, useVoidOrder)
lib/          ← reprintOrder, reprintShiftReport, reprintCommand (reimpresión de ticket/reporte/comanda)
components/   ← ShiftButton (header UI), ShiftReportModal, ShiftControlPanel, ShiftReportView, EditOrderModal, VoidOrderConfirm
```

## Registro

- `manifest.ts` registra `ShiftControlPanel` como tab de Settings vía `ModuleManifest`
- Flag: `shift_management_enabled` en feature flags

## Dependencias

- `checkout` (para asociar `shiftId` a órdenes, y para el ruteo de comandas por categoría)
- `menu` (categorías, para reimprimir comanda)
- `printer` (impresoras de ticket/comanda)
- `settings` (registry de tabs, encabezado de comanda)
- `feature-flags` (para mostrar/ocultar)
