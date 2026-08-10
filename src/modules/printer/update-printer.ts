import { errAsync, type ResultAsync } from "neverthrow";

import { PrinterValidationError, type PrinterDomainError } from "./errors";
import type { Printer, PrinterUpdateInput } from "./printer";
import { PRINTER_ROLE } from "./printer";
import type { PrinterRepository } from "./ports";

function validatePrinterInput(input: PrinterUpdateInput): PrinterDomainError | null {
  if (input.name.trim().length === 0) {
    return new PrinterValidationError("printerNameRequired");
  }

  if (input.address.trim().length === 0) {
    return new PrinterValidationError("printerAddressRequired");
  }

  if (input.isDefault === true && input.role !== PRINTER_ROLE.RECEIPT) {
    return new PrinterValidationError("printerDefaultRoleInvalid");
  }

  return null;
}

function normalizePrinterInput(input: PrinterUpdateInput): PrinterUpdateInput {
  return {
    name: input.name.trim(),
    type: input.type,
    address: input.address.trim(),
    role: input.role,
    isDefault: input.isDefault ?? false,
    labelWidthMm: input.labelWidthMm,
    labelHeightMm: input.labelHeightMm,
    labelGapMm: input.labelGapMm,
    labelLanguage: input.labelLanguage,
  };
}

export function updatePrinter(
  repository: PrinterRepository,
  id: string,
  input: PrinterUpdateInput,
): ResultAsync<Printer, PrinterDomainError> {
  const validationError = validatePrinterInput(input);
  if (validationError) {
    return errAsync(validationError);
  }

  return repository.update(id, normalizePrinterInput(input));
}
