import type { ResultAsync } from "neverthrow";
import { errAsync } from "neverthrow";

import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import { NoActiveShiftError, ShiftPersistenceError } from "../domain/errors";

export function closeShift(
  repository: ShiftRepository,
  shiftId: string,
  countedCash: number,
): ResultAsync<Shift, NoActiveShiftError | ShiftPersistenceError> {
  if (countedCash < 0) {
    return errAsync(new ShiftPersistenceError("invalidCountedCash"));
  }
  return repository.closeShift(shiftId, countedCash);
}