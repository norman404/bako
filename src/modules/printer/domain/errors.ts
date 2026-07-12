export class PrinterDomainError extends Error {
  readonly kind = "PrinterDomainError";

  constructor(message: string) {
    super(message);
    this.name = "PrinterDomainError";
  }
}

export class PrinterNotFoundError extends PrinterDomainError {
  constructor(id: string) {
    super(`Printer not found: ${id}`);
    this.name = "PrinterNotFoundError";
  }
}

export class PrinterValidationError extends PrinterDomainError {
  constructor(message: string) {
    super(message);
    this.name = "PrinterValidationError";
  }
}
