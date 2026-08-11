import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "./ports";
import type { CashMovement } from "./shift";
import { ShiftPersistenceError } from "./errors";

export function listCashMovements(
  repository: ShiftRepository,
  shiftId: string,
): ResultAsync<CashMovement[], ShiftPersistenceError> {
  return repository.listCashMovements(shiftId);
}