import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "./ports";
import type { ShiftReport } from "./shift";
import type { ShiftPersistenceError } from "./errors";

export function getShiftReport(
  repository: ShiftRepository,
  shiftId: string,
): ResultAsync<ShiftReport, ShiftPersistenceError> {
  return repository.getReport(shiftId);
}
