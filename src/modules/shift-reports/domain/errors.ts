export class ShiftPersistenceError extends Error {
  readonly kind = "ShiftPersistenceError";

  constructor(message: string) {
    super(message);
    this.name = "ShiftPersistenceError";
  }
}

export class ShiftAlreadyActiveError extends ShiftPersistenceError {
  constructor() {
    super("Already have an active shift");
    this.name = "ShiftAlreadyActiveError";
  }
}

export class NoActiveShiftError extends ShiftPersistenceError {
  constructor() {
    super("No active shift found");
    this.name = "NoActiveShiftError";
  }
}
