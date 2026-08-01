import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "../domain/ports";
import type { CashMovement } from "../domain/shift";
import { ShiftPersistenceError } from "../domain/errors";

export function listCashMovements(
  repository: ShiftRepository,
  shiftId: string,
): ResultAsync<CashMovement[], ShiftPersistenceError> {
  return repository.listCashMovements(shiftId);
}