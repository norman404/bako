import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "./ports";
import type { ShiftHistoryItem } from "./shift";
import type { ShiftPersistenceError } from "./errors";

export function listShiftHistory(
  repository: ShiftRepository,
): ResultAsync<ShiftHistoryItem[], ShiftPersistenceError> {
  return repository.listHistory();
}
