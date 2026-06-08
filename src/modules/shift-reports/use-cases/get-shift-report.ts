import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "../domain/ports";
import type { ShiftReport } from "../domain/shift";
import type { ShiftPersistenceError } from "../domain/errors";

export function getShiftReport(
  repository: ShiftRepository,
  shiftId: string,
): ResultAsync<ShiftReport, ShiftPersistenceError> {
  return repository.getReport(shiftId);
}
