import type { ResultAsync } from "neverthrow";

import type { Shift, ShiftHistoryItem, ShiftReport } from "./shift";
import type { ShiftPersistenceError } from "./errors";

export interface ShiftRepository {
  openShift(): ResultAsync<Shift, ShiftPersistenceError>;
  closeShift(shiftId: string): ResultAsync<Shift, ShiftPersistenceError>;
  getActive(): ResultAsync<Shift | null, ShiftPersistenceError>;
  listHistory(): ResultAsync<ShiftHistoryItem[], ShiftPersistenceError>;
  getReport(shiftId: string): ResultAsync<ShiftReport, ShiftPersistenceError>;
}
