import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { PrinterDomainError } from "@/modules/printer/domain/errors";
import type { PrinterRepository } from "@/modules/printer/domain/ports";
import { buildPrinter } from "@/modules/printer/test/factories";
import { archivePrinter } from "./archive-printer";

function buildMockRepository(
  overrides: Partial<PrinterRepository> = {},
): PrinterRepository {
  const printer = buildPrinter();
  return {
    list: () => okAsync([printer]),
    findById: () => okAsync(printer),
    create: () => okAsync(printer),
    update: () => okAsync(printer),
    archive: () => okAsync(undefined),
    ...overrides,
  } as PrinterRepository;
}

describe("archivePrinter", () => {
  it("delegates to repository.archive()", async () => {
    const id = "printer-1";
    const mockRepository = buildMockRepository({
      archive: (receivedId) => {
        expect(receivedId).toBe(id);
        return okAsync(undefined);
      },
    });

    const result = await archivePrinter(mockRepository, id);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBeUndefined();
  });

  it("propagates repository errors", async () => {
    const mockError = new PrinterDomainError("dbError", { context: "Database connection failed" });
    const mockRepository = buildMockRepository({ archive: () => errAsync(mockError) });

    const result = await archivePrinter(mockRepository, "printer-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected archivePrinter to fail");
    }

    expect(result.error).toBe(mockError);
  });
});
