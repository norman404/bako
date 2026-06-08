import type { ResultAsync } from "neverthrow";

import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import { NoActiveShiftError } from "../domain/errors";

export function closeShift(
  repository: ShiftRepository,
  shiftId: string,
): ResultAsync<Shift, NoActiveShiftError> {
  return repository.closeShift(shiftId);
}
