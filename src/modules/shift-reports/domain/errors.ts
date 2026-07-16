export type ShiftErrorCode =
  | "shiftAlreadyActive"
  | "noActiveShift"
  | "shiftNotFound"
  | "dbError";

export interface ShiftTranslatableError {
  readonly code: ShiftErrorCode;
  readonly params?: Record<string, unknown>;
}

export class ShiftPersistenceError extends Error implements ShiftTranslatableError {
  readonly kind = "ShiftPersistenceError";
  readonly code: ShiftErrorCode;
  readonly params?: Record<string, unknown>;

  constructor(code: ShiftErrorCode, params?: Record<string, unknown>, message?: string) {
    super(message ?? `${code}: ${params ? JSON.stringify(params) : ""}`.trim());
    this.name = "ShiftPersistenceError";
    this.code = code;
    this.params = params;
  }
}

export class ShiftAlreadyActiveError extends ShiftPersistenceError {
  constructor() {
    super("shiftAlreadyActive", undefined, "Already have an active shift");
    this.name = "ShiftAlreadyActiveError";
  }
}

export class NoActiveShiftError extends ShiftPersistenceError {
  constructor() {
    super("noActiveShift", undefined, "No active shift found");
    this.name = "NoActiveShiftError";
  }
}
