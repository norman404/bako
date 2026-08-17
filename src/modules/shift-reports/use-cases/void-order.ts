import type { ResultAsync } from "neverthrow";

import type { ShiftPersistenceError } from "@/modules/shift-reports/domain/errors";
import type { ShiftRepository } from "@/modules/shift-reports/domain/ports";

export function voidOrder(
  repository: ShiftRepository,
  orderId: string,
): ResultAsync<void, ShiftPersistenceError> {
  return repository.voidOrder(orderId);
}
