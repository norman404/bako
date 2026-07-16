import { describe, expect, it } from "vitest";
import { errAsync, okAsync } from "neverthrow";

import { PrinterDomainError, PrinterValidationError } from "@/modules/printer/domain/errors";
import type { Printer, PrinterUpdateInput, PrinterType, PrinterRole } from "@/modules/printer/domain/printer";
import type { PrinterRepository } from "@/modules/printer/domain/ports";
import { updatePrinter } from "./update-printer";

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

describe("updatePrinter", () => {
  it("delegates to repository.update() when input is valid", async () => {
    const id = "printer-1";
    const input: PrinterUpdateInput = {
      name: "Barra",
      type: "usb",
      address: "04b8:0e15",
      role: "bar",
    };
    const updatedPrinter = buildPrinter({ id, ...input });
    const mockRepository = buildMockRepository({
      update: (receivedId, receivedInput) => {
        expect(receivedId).toBe(id);
        expect(receivedInput).toEqual(input);
        return okAsync(updatedPrinter);
      },
    });

    const result = await updatePrinter(mockRepository, id, input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(updatedPrinter);
  });

  it("returns validation error when name is empty", async () => {
    const input: PrinterUpdateInput = {
      name: "",
      type: "network",
      address: "192.168.1.50:9100",
      role: "kitchen",
    };
    const mockRepository = buildMockRepository();

    const result = await updatePrinter(mockRepository, "printer-1", input);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected updatePrinter to fail");
    }

    expect(result.error).toBeInstanceOf(PrinterValidationError);
  });

  it("propagates repository errors", async () => {
    const input: PrinterUpdateInput = {
      name: "Barra",
      type: "network",
      address: "192.168.1.51:9100",
      role: "bar",
    };
    const mockError = new PrinterDomainError("dbError", { context: "Database connection failed" });
    const mockRepository = buildMockRepository({ update: () => errAsync(mockError) });

    const result = await updatePrinter(mockRepository, "printer-1", input);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected updatePrinter to fail");
    }

    expect(result.error).toBe(mockError);
  });
});
