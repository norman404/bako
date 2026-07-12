import type { ResultAsync } from "neverthrow";

import type { PrinterDomainError } from "@/modules/printer/domain/errors";
import type { PrinterRepository } from "@/modules/printer/domain/ports";

export function archivePrinter(
  repository: PrinterRepository,
  id: string,
): ResultAsync<void, PrinterDomainError> {
  return repository.archive(id);
}
