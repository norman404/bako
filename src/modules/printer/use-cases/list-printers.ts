import type { ResultAsync } from "neverthrow";

import type { Printer } from "@/modules/printer/domain/printer";
import type { PrinterDomainError } from "@/modules/printer/domain/errors";
import type { PrinterRepository } from "@/modules/printer/domain/ports";

export function listPrinters(
  repository: PrinterRepository,
): ResultAsync<Printer[], PrinterDomainError> {
  return repository.list();
}
