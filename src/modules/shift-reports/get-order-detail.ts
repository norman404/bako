import type { ResultAsync } from "neverthrow";

import type { ShiftPersistenceError } from "./errors";
import type { OrderDetail } from "./order-management";
import type { ShiftRepository } from "./ports";

export function getOrderDetail(
  repository: ShiftRepository,
  orderId: string,
): ResultAsync<OrderDetail, ShiftPersistenceError> {
  return repository.getOrderDetail(orderId);
}
