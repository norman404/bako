import { describe, expect, it } from "vitest";
import { errAsync, okAsync } from "neverthrow";

import { PrinterDomainError } from "@/modules/printer/domain/errors";
import type { Printer, PrinterType, PrinterRole } from "@/modules/printer/domain/printer";
import type { PrinterRepository } from "@/modules/printer/domain/ports";
import { archivePrinter } from "./archive-printer";

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
