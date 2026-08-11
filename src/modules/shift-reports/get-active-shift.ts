import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "./ports";
import type { Shift } from "./shift";
import type { ShiftPersistenceError } from "./errors";

export function getActiveShift(
  repository: ShiftRepository,
): ResultAsync<Shift | null, ShiftPersistenceError> {
  return repository.getActive();
}
