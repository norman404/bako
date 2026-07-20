import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { PrinterDomainError, PrinterValidationError } from "@/modules/printer/domain/errors";
import type { Printer, PrinterCreateInput, PrinterType, PrinterRole } from "@/modules/printer/domain/printer";
import type { PrinterRepository } from "@/modules/printer/domain/ports";
import { createPrinter } from "./create-printer";

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

describe("createPrinter", () => {
  it("delegates to repository.create() when input is valid", async () => {
    const input: PrinterCreateInput = {
      name: "Cocina",
      type: "network",
      address: "192.168.1.50:9100",
      role: "kitchen",
    };
    const createdPrinter = buildPrinter({ id: "printer-created" });
    const mockRepository = buildMockRepository({
      create: (receivedInput) => {
        expect(receivedInput).toEqual(input);
        return okAsync(createdPrinter);
      },
    });

    const result = await createPrinter(mockRepository, input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(createdPrinter);
  });

  it("returns validation error when name is empty", async () => {
    const input: PrinterCreateInput = {
      name: "   ",
      type: "network",
      address: "192.168.1.50:9100",
      role: "kitchen",
    };
    const mockRepository = buildMockRepository();

    const result = await createPrinter(mockRepository, input);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected createPrinter to fail");
    }

    expect(result.error).toBeInstanceOf(PrinterValidationError);
    expect(result.error.code).toBe("printerNameRequired");
  });

  it("returns validation error when address is empty", async () => {
    const input: PrinterCreateInput = {
      name: "Cocina",
      type: "network",
      address: "",
      role: "kitchen",
    };
    const mockRepository = buildMockRepository();

    const result = await createPrinter(mockRepository, input);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected createPrinter to fail");
    }

    expect(result.error).toBeInstanceOf(PrinterValidationError);
    expect(result.error.code).toBe("printerAddressRequired");
  });

  it("propagates repository errors", async () => {
    const input: PrinterCreateInput = {
      name: "Cocina",
      type: "network",
      address: "192.168.1.50:9100",
      role: "kitchen",
    };
    const mockError = new PrinterDomainError("dbError", { context: "Database connection failed" });
    const mockRepository = buildMockRepository({ create: () => errAsync(mockError) });

    const result = await createPrinter(mockRepository, input);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected createPrinter to fail");
    }

    expect(result.error).toBe(mockError);
  });
});
