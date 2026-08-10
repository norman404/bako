import type { ResultAsync } from "neverthrow";

import type { Printer } from "./printer";
import type { PrinterDomainError } from "./errors";
import type { PrinterRepository } from "./ports";

export function listPrinters(
  repository: PrinterRepository,
): ResultAsync<Printer[], PrinterDomainError> {
  return repository.list();
}
