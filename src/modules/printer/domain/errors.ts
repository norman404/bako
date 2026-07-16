export type PrinterErrorCode =
  | "printerNotFound"
  | "printerNameRequired"
  | "printerAddressRequired"
  | "printerTypeInvalid"
  | "printerRoleInvalid"
  | "dbError";

export interface PrinterTranslatableError {
  readonly code: PrinterErrorCode;
  readonly params?: Record<string, unknown>;
}

export class PrinterDomainError extends Error implements PrinterTranslatableError {
  readonly kind = "PrinterDomainError";
  readonly code: PrinterErrorCode;
  readonly params?: Record<string, unknown>;

  constructor(code: PrinterErrorCode, params?: Record<string, unknown>, message?: string) {
    super(message ?? `${code}: ${params ? JSON.stringify(params) : ""}`.trim());
    this.name = "PrinterDomainError";
    this.code = code;
    this.params = params;
  }
}

export class PrinterNotFoundError extends PrinterDomainError {
  constructor(id: string) {
    super("printerNotFound", { printerId: id }, `Printer not found: ${id}`);
    this.name = "PrinterNotFoundError";
  }
}

export class PrinterValidationError extends PrinterDomainError {
  constructor(code: PrinterErrorCode, params?: Record<string, unknown>, message?: string) {
    super(code, params, message);
    this.name = "PrinterValidationError";
  }
}
