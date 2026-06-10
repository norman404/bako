import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import type { ShiftPersistenceError } from "../domain/errors";

export function getActiveShift(
  repository: ShiftRepository,
): ResultAsync<Shift | null, ShiftPersistenceError> {
  return repository.getActive();
}
