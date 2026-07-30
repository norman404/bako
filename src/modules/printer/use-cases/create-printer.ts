import { errAsync, type ResultAsync } from "neverthrow";

import { PrinterValidationError, type PrinterDomainError } from "@/modules/printer/domain/errors";
import type { Printer, PrinterCreateInput } from "@/modules/printer/domain/printer";
import { PRINTER_ROLE } from "@/modules/printer/domain/printer";
import type { PrinterRepository } from "@/modules/printer/domain/ports";

function validatePrinterInput(input: PrinterCreateInput): PrinterDomainError | null {
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

function normalizePrinterInput(input: PrinterCreateInput): PrinterCreateInput {
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

export function createPrinter(
  repository: PrinterRepository,
  input: PrinterCreateInput,
): ResultAsync<Printer, PrinterDomainError> {
  const validationError = validatePrinterInput(input);
  if (validationError) {
    return errAsync(validationError);
  }

  return repository.create(normalizePrinterInput(input));
}
