import type { ResultAsync } from "neverthrow";

import type {
  CashMovement,
  CashMovementInput,
  Shift,
  ShiftHistoryItem,
  ShiftReport,
  UpdateCashMovementInput,
} from "./shift";
import type { ShiftPersistenceError } from "./errors";
import type { OrderDetail, UpdateOrderInput } from "./order-management";

export interface ShiftRepository {
  openShift(openingCash: number): ResultAsync<Shift, ShiftPersistenceError>;
  closeShift(shiftId: string, countedCash: number): ResultAsync<Shift, ShiftPersistenceError>;
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

  addCashMovement(
    shiftId: string,
    input: CashMovementInput,
  ): ResultAsync<CashMovement, ShiftPersistenceError>;
  updateCashMovement(
    id: string,
    input: UpdateCashMovementInput,
  ): ResultAsync<CashMovement, ShiftPersistenceError>;
  deleteCashMovement(id: string): ResultAsync<void, ShiftPersistenceError>;
  listCashMovements(shiftId: string): ResultAsync<CashMovement[], ShiftPersistenceError>;
}
