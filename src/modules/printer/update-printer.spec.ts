import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { PrinterDomainError, PrinterValidationError } from "./errors";
import type { PrinterUpdateInput } from "./printer";
import { PRINTER_ROLE } from "./printer";
import type { PrinterRepository } from "./ports";
import { buildPrinter } from "./test/factories";
import { updatePrinter } from "./update-printer";

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
  it("delegates to repository.update() with normalized input (isDefault defaults to false)", async () => {
    const id = "printer-1";
    const input: PrinterUpdateInput = {
      name: "Barra",
      type: "usb",
      address: "04b8:0e15",
      role: "comanda",
    };
    const expectedNormalized: PrinterUpdateInput = {
      name: "Barra",
      type: "usb",
      address: "04b8:0e15",
      role: "comanda",
      isDefault: false,
      labelWidthMm: undefined,
      labelHeightMm: undefined,
      labelGapMm: undefined,
      labelLanguage: undefined,
    };
    const updatedPrinter = buildPrinter({ id, ...input });
    const mockRepository = buildMockRepository({
      update: (receivedId, receivedInput) => {
        expect(receivedId).toBe(id);
        expect(receivedInput).toEqual(expectedNormalized);
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
      role: "comanda",
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
      role: "comanda",
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

  describe("isDefault + role validation", () => {
    it("rejects isDefault=true with role=comanda", async () => {
      const input: PrinterUpdateInput = {
        name: "Cocina",
        type: "network",
        address: "192.168.1.50:9100",
        role: "comanda",
        isDefault: true,
      };
      const mockRepository = buildMockRepository();

      const result = await updatePrinter(mockRepository, "printer-1", input);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        throw new Error("Expected updatePrinter to fail");
      }

      expect(result.error).toBeInstanceOf(PrinterValidationError);
      expect(result.error.code).toBe("printerDefaultRoleInvalid");
    });

    it("rejects isDefault=true with role=comanda (usb printer)", async () => {
      const input: PrinterUpdateInput = {
        name: "Barra",
        type: "usb",
        address: "04b8:0e15",
        role: "comanda",
        isDefault: true,
      };
      const mockRepository = buildMockRepository();

      const result = await updatePrinter(mockRepository, "printer-1", input);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        throw new Error("Expected updatePrinter to fail");
      }

      expect(result.error.code).toBe("printerDefaultRoleInvalid");
    });

    it("accepts isDefault=true with role=receipt and delegates to repository", async () => {
      const input: PrinterUpdateInput = {
        name: "Caja 1",
        type: "network",
        address: "192.168.1.50:9100",
        role: PRINTER_ROLE.RECEIPT,
        isDefault: true,
      };
      const updatedPrinter = buildPrinter({ id: "printer-1", role: PRINTER_ROLE.RECEIPT, isDefault: true });
      const mockRepository = buildMockRepository({
        update: (_receivedId, receivedInput) => {
          expect(receivedInput.isDefault).toBe(true);
          expect(receivedInput.role).toBe(PRINTER_ROLE.RECEIPT);
          return okAsync(updatedPrinter);
        },
      });

      const result = await updatePrinter(mockRepository, "printer-1", input);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value).toEqual(updatedPrinter);
    });

    it("accepts isDefault=false with role=comanda", async () => {
      const input: PrinterUpdateInput = {
        name: "Cocina",
        type: "network",
        address: "192.168.1.50:9100",
        role: "comanda",
        isDefault: false,
      };
      const mockRepository = buildMockRepository({
        update: () => okAsync(buildPrinter({ role: "comanda", isDefault: false })),
      });

      const result = await updatePrinter(mockRepository, "printer-1", input);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
    });

    it("accepts isDefault omitted (defaults to false) with any role", async () => {
      const input: PrinterUpdateInput = {
        name: "Cocina",
        type: "network",
        address: "192.168.1.50:9100",
        role: "comanda",
      };
      const mockRepository = buildMockRepository({
        update: (_id, receivedInput) => {
          expect(receivedInput.isDefault).toBe(false);
          return okAsync(buildPrinter());
        },
      });

      const result = await updatePrinter(mockRepository, "printer-1", input);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
    });
  });
});
