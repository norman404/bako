import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { PrinterDomainError, PrinterValidationError } from "./errors";
import type { PrinterCreateInput } from "./printer";
import { PRINTER_ROLE } from "./printer";
import type { PrinterRepository } from "./ports";
import { buildPrinter } from "./test/factories";
import { createPrinter } from "./create-printer";

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
  it("delegates to repository.create() with normalized input (isDefault defaults to false)", async () => {
    const input: PrinterCreateInput = {
      name: "Cocina",
      type: "network",
      address: "192.168.1.50:9100",
      role: "comanda",
    };
    const expectedNormalized: PrinterCreateInput = {
      name: "Cocina",
      type: "network",
      address: "192.168.1.50:9100",
      role: "comanda",
      isDefault: false,
      labelWidthMm: undefined,
      labelHeightMm: undefined,
      labelGapMm: undefined,
      labelLanguage: undefined,
    };
    const createdPrinter = buildPrinter({ id: "printer-created" });
    const mockRepository = buildMockRepository({
      create: (receivedInput) => {
        expect(receivedInput).toEqual(expectedNormalized);
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
      role: "comanda",
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
      role: "comanda",
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
      role: "comanda",
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

  describe("isDefault + role validation", () => {
    it("rejects isDefault=true with role=comanda", async () => {
      const input: PrinterCreateInput = {
        name: "Cocina",
        type: "network",
        address: "192.168.1.50:9100",
        role: "comanda",
        isDefault: true,
      };
      const mockRepository = buildMockRepository();

      const result = await createPrinter(mockRepository, input);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        throw new Error("Expected createPrinter to fail");
      }

      expect(result.error).toBeInstanceOf(PrinterValidationError);
      expect(result.error.code).toBe("printerDefaultRoleInvalid");
    });

    it("rejects isDefault=true with role=comanda (usb printer)", async () => {
      const input: PrinterCreateInput = {
        name: "Barra",
        type: "usb",
        address: "04b8:0e15",
        role: "comanda",
        isDefault: true,
      };
      const mockRepository = buildMockRepository();

      const result = await createPrinter(mockRepository, input);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        throw new Error("Expected createPrinter to fail");
      }

      expect(result.error.code).toBe("printerDefaultRoleInvalid");
    });

    it("accepts isDefault=true with role=receipt and delegates to repository", async () => {
      const input: PrinterCreateInput = {
        name: "Caja 1",
        type: "network",
        address: "192.168.1.50:9100",
        role: PRINTER_ROLE.RECEIPT,
        isDefault: true,
      };
      const createdPrinter = buildPrinter({ id: "printer-created", role: PRINTER_ROLE.RECEIPT, isDefault: true });
      const mockRepository = buildMockRepository({
        create: (receivedInput) => {
          expect(receivedInput.isDefault).toBe(true);
          expect(receivedInput.role).toBe(PRINTER_ROLE.RECEIPT);
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

    it("accepts isDefault=false with role=comanda", async () => {
      const input: PrinterCreateInput = {
        name: "Cocina",
        type: "network",
        address: "192.168.1.50:9100",
        role: "comanda",
        isDefault: false,
      };
      const mockRepository = buildMockRepository({
        create: () => okAsync(buildPrinter({ role: "comanda", isDefault: false })),
      });

      const result = await createPrinter(mockRepository, input);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
    });

    it("accepts isDefault omitted (defaults to false) with any role", async () => {
      const input: PrinterCreateInput = {
        name: "Cocina",
        type: "network",
        address: "192.168.1.50:9100",
        role: "comanda",
      };
      const mockRepository = buildMockRepository({
        create: (receivedInput) => {
          expect(receivedInput.isDefault).toBe(false);
          return okAsync(buildPrinter());
        },
      });

      const result = await createPrinter(mockRepository, input);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
    });
  });
});
