import type { ResultAsync } from "neverthrow";

import type { ShiftPersistenceError } from "./errors";
import type { OrderDetail, UpdateOrderInput } from "./order-management";
import type { ShiftRepository } from "./ports";

export function updateOrder(
  repository: ShiftRepository,
  orderId: string,
  input: UpdateOrderInput,
): ResultAsync<OrderDetail, ShiftPersistenceError> {
  return repository.updateOrder(orderId, input);
}
