import { errAsync, type ResultAsync } from "neverthrow";

import { PrinterValidationError, type PrinterDomainError } from "@/modules/printer/domain/errors";
import type { Printer, PrinterUpdateInput } from "@/modules/printer/domain/printer";
import type { PrinterRepository } from "@/modules/printer/domain/ports";

function validatePrinterInput(input: PrinterUpdateInput): PrinterDomainError | null {
  if (input.name.trim().length === 0) {
    return new PrinterValidationError("Printer name is required");
  }

  if (input.address.trim().length === 0) {
    return new PrinterValidationError("Printer address is required");
  }

  return null;
}

function normalizePrinterInput(input: PrinterUpdateInput): PrinterUpdateInput {
  return {
    name: input.name.trim(),
    type: input.type,
    address: input.address.trim(),
    role: input.role,
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
