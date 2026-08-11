import type { ResultAsync } from "neverthrow";
import { errAsync } from "neverthrow";

import type { ShiftRepository } from "./ports";
import type { Shift } from "./shift";
import { ShiftAlreadyActiveError, ShiftPersistenceError } from "./errors";

export function openShift(
  repository: ShiftRepository,
  openingCash: number,
): ResultAsync<Shift, ShiftAlreadyActiveError | ShiftPersistenceError> {
  if (openingCash <= 0) {
    return errAsync(new ShiftPersistenceError("invalidOpeningCash"));
  }
  return repository
    .getActive()
    .andThen((active) => {
      if (active) {
        return errAsync(new ShiftAlreadyActiveError());
      }
      return repository.openShift(openingCash);
    });
}