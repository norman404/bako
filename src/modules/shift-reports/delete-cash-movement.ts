import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "./ports";
import { ShiftPersistenceError } from "./errors";

export function deleteCashMovement(
  repository: ShiftRepository,
  id: string,
): ResultAsync<void, ShiftPersistenceError> {
  return repository.deleteCashMovement(id);
}