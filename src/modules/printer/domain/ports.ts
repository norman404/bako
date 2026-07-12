import type { ResultAsync } from "neverthrow";

import type { Printer, PrinterCreateInput, PrinterUpdateInput } from "./printer";
import type { PrinterDomainError } from "./errors";

export interface PrinterRepository {
  list(): ResultAsync<Printer[], PrinterDomainError>;
  findById(id: string): ResultAsync<Printer, PrinterDomainError>;
  create(input: PrinterCreateInput): ResultAsync<Printer, PrinterDomainError>;
  update(id: string, input: PrinterUpdateInput): ResultAsync<Printer, PrinterDomainError>;
  archive(id: string): ResultAsync<void, PrinterDomainError>;
}
