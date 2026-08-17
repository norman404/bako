import type { ResultAsync } from "neverthrow";

import type { ShiftPersistenceError } from "@/modules/shift-reports/domain/errors";
import type { OrderDetail } from "@/modules/shift-reports/domain/order-management";
import type { ShiftRepository } from "@/modules/shift-reports/domain/ports";

export function getOrderDetail(
  repository: ShiftRepository,
  orderId: string,
): ResultAsync<OrderDetail, ShiftPersistenceError> {
  return repository.getOrderDetail(orderId);
}
