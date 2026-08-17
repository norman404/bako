import type { ResultAsync } from "neverthrow";
import { errAsync } from "neverthrow";

import type { ShiftRepository } from "../domain/ports";
import type { CashMovement, UpdateCashMovementInput } from "../domain/shift";
import { ShiftPersistenceError } from "../domain/errors";

export function updateCashMovement(
  repository: ShiftRepository,
  id: string,
  input: UpdateCashMovementInput,
): ResultAsync<CashMovement, ShiftPersistenceError> {
  if (input.amount !== undefined && input.amount <= 0) {
    return errAsync(new ShiftPersistenceError("invalidCashMovement"));
  }
  if (input.reason !== undefined && input.reason.trim().length < 3) {
    return errAsync(new ShiftPersistenceError("invalidCashMovement"));
  }
  return repository.updateCashMovement(id, input);
}