import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "../domain/ports";
import { ShiftPersistenceError } from "../domain/errors";

export function deleteCashMovement(
  repository: ShiftRepository,
  id: string,
): ResultAsync<void, ShiftPersistenceError> {
  return repository.deleteCashMovement(id);
}