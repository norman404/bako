import type { ResultAsync } from "neverthrow";

import type { ShiftPersistenceError } from "./errors";
import type { ShiftRepository } from "./ports";

export function voidOrder(
  repository: ShiftRepository,
  orderId: string,
): ResultAsync<void, ShiftPersistenceError> {
  return repository.voidOrder(orderId);
}
