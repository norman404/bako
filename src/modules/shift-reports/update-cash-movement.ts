import type { ResultAsync } from "neverthrow";
import { errAsync } from "neverthrow";

import type { ShiftRepository } from "./ports";
import type { CashMovement, UpdateCashMovementInput } from "./shift";
import { ShiftPersistenceError } from "./errors";

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