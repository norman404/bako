import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { PrinterDomainError } from "./errors";
import type { PrinterRepository } from "./ports";
import { buildPrinter } from "./test/factories";
import { listPrinters } from "./list-printers";

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

describe("listPrinters", () => {
  it("delegates to repository.list()", async () => {
    const mockPrinters = [buildPrinter({ id: "p1" }), buildPrinter({ id: "p2", name: "Barra" })];
    const mockRepository = buildMockRepository({ list: () => okAsync(mockPrinters) });

    const result = await listPrinters(mockRepository);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(mockPrinters);
  });

  it("propagates repository errors", async () => {
    const mockError = new PrinterDomainError("dbError", { context: "Database connection failed" });
    const mockRepository = buildMockRepository({ list: () => errAsync(mockError) });

    const result = await listPrinters(mockRepository);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected listPrinters to fail");
    }

    expect(result.error).toBe(mockError);
  });
});
