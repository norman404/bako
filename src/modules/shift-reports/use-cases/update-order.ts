import type { ResultAsync } from "neverthrow";

import type { ShiftPersistenceError } from "@/modules/shift-reports/domain/errors";
import type { OrderDetail, UpdateOrderInput } from "@/modules/shift-reports/domain/order-management";
import type { ShiftRepository } from "@/modules/shift-reports/domain/ports";

export function updateOrder(
  repository: ShiftRepository,
  orderId: string,
  input: UpdateOrderInput,
): ResultAsync<OrderDetail, ShiftPersistenceError> {
  return repository.updateOrder(orderId, input);
}
