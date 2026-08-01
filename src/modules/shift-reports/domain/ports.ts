import type { ResultAsync } from "neverthrow";

import type { Shift, ShiftHistoryItem, ShiftReport } from "./shift";
import type { ShiftPersistenceError } from "./errors";
import type { OrderDetail, UpdateOrderInput } from "./order-management";

export interface ShiftRepository {
  openShift(): ResultAsync<Shift, ShiftPersistenceError>;
  closeShift(shiftId: string): ResultAsync<Shift, ShiftPersistenceError>;
  getActive(): ResultAsync<Shift | null, ShiftPersistenceError>;
  listHistory(): ResultAsync<ShiftHistoryItem[], ShiftPersistenceError>;
  getReport(shiftId: string): ResultAsync<ShiftReport, ShiftPersistenceError>;

  /** Get full order details for display/editing within a shift context. */
  getOrderDetail(orderId: string): ResultAsync<OrderDetail, ShiftPersistenceError>;

  /** Soft-void an order. Sets voidedAt timestamp. */
  voidOrder(orderId: string): ResultAsync<void, ShiftPersistenceError>;

  /** Update order items and/or payment. Recalculates total. */
  updateOrder(
    orderId: string,
    input: UpdateOrderInput,
  ): ResultAsync<OrderDetail, ShiftPersistenceError>;
}
