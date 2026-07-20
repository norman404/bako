import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { PrinterDomainError } from "@/modules/printer/domain/errors";
import type { Printer, PrinterType, PrinterRole } from "@/modules/printer/domain/printer";
import type { PrinterRepository } from "@/modules/printer/domain/ports";
import { listPrinters } from "./list-printers";

function buildPrinter(overrides: Partial<Printer> = {}): Printer {
  return {
    id: overrides.id ?? "printer-1",
    name: overrides.name ?? "Cocina",
    type: (overrides.type ?? "network") as PrinterType,
    address: overrides.address ?? "192.168.1.50:9100",
    role: (overrides.role ?? "kitchen") as PrinterRole,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

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
