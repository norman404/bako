import type { ResultAsync } from "neverthrow";

import type { PrinterDomainError } from "./errors";
import type { PrinterRepository } from "./ports";

export function archivePrinter(
  repository: PrinterRepository,
  id: string,
): ResultAsync<void, PrinterDomainError> {
  return repository.archive(id);
}
