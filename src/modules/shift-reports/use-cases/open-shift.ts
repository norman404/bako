import type { ResultAsync } from "neverthrow";
import { errAsync } from "neverthrow";

import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import { ShiftAlreadyActiveError } from "../domain/errors";

export function openShift(
  repository: ShiftRepository,
): ResultAsync<Shift, ShiftAlreadyActiveError> {
  return repository
    .getActive()
    .andThen((active) => {
      if (active) {
        return errAsync(new ShiftAlreadyActiveError());
      }
      return repository.openShift();
    });
}
