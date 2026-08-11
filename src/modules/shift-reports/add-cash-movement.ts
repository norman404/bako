import type { ResultAsync } from "neverthrow";
import { errAsync } from "neverthrow";

import type { ShiftRepository } from "./ports";
import type { CashMovement, CashMovementInput } from "./shift";
import { ShiftPersistenceError } from "./errors";

export function addCashMovement(
  repository: ShiftRepository,
  shiftId: string,
  input: CashMovementInput,
): ResultAsync<CashMovement, ShiftPersistenceError> {
  if (input.amount <= 0) {
    return errAsync(new ShiftPersistenceError("invalidCashMovement"));
  }
  if (input.reason.trim().length < 3) {
    return errAsync(new ShiftPersistenceError("invalidCashMovement"));
  }
  return repository.addCashMovement(shiftId, input);
}