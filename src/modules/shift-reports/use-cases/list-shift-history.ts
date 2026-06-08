import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "../domain/ports";
import type { ShiftHistoryItem } from "../domain/shift";
import type { ShiftPersistenceError } from "../domain/errors";

export function listShiftHistory(
  repository: ShiftRepository,
): ResultAsync<ShiftHistoryItem[], ShiftPersistenceError> {
  return repository.listHistory();
}
