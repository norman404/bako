import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import type { PrinterCreateInput } from "./printer";
import { PRINTER_ROLE } from "./printer";
import type { PrinterRow } from "@/db/schema";

const dbMocks = (() => {
  const selectLimitMock = mock<() => Promise<PrinterRow[]>>();
  const selectWhereMock = mock<any>(() => ({ limit: selectLimitMock }));
  const selectFromMock = mock<any>(() => ({ where: selectWhereMock }));
  const selectMock = mock<any>(() => ({ from: selectFromMock }));

  const insertReturningMock = mock<() => Promise<PrinterRow[]>>();
  const insertValuesMock = mock<(values: Partial<PrinterRow>) => { returning: typeof insertReturningMock }>(
    () => ({ returning: insertReturningMock }),
  );
  const insertMock = mock(() => ({ values: insertValuesMock }));

  const updateReturningMock = mock<() => Promise<PrinterRow[]>>();
  const updateWhereMock = mock<any>(() => ({ returning: updateReturningMock }));
  const updateSetMock = mock<(values: Partial<PrinterRow>) => { where: typeof updateWhereMock }>(
    () => ({ where: updateWhereMock }),
  );
  const updateMock = mock(() => ({ set: updateSetMock }));

  return {
    selectLimitMock,
    selectWhereMock,
    selectFromMock,
    selectMock,
    insertReturningMock,
    insertValuesMock,
    insertMock,
    updateReturningMock,
    updateWhereMock,
    updateSetMock,
    updateMock,
  };
})();

mock.module("@/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
    insert: dbMocks.insertMock,
    update: dbMocks.updateMock,
  },
}));

import { PrinterValidationError } from "./errors";
import { printerDrizzleRepository } from "./repository";

function buildPrinterRow(overrides: Partial<PrinterRow> = {}): PrinterRow {
  return {
    id: overrides.id ?? "printer-1",
    name: overrides.name ?? "Cocina",
    type: overrides.type ?? "network",
    address: overrides.address ?? "192.168.1.50:9100",
    role: overrides.role ?? "comanda",
    isDefault: overrides.isDefault ?? false,
    labelWidthMm: overrides.labelWidthMm ?? 40,
    labelHeightMm: overrides.labelHeightMm ?? 30,
    labelGapMm: overrides.labelGapMm ?? 2,
    labelLanguage: overrides.labelLanguage ?? "tspl",
    labelOrientation: overrides.labelOrientation ?? "landscape",
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe("printerDrizzleRepository", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    dbMocks.selectFromMock.mockImplementation(() => ({ where: dbMocks.selectWhereMock }));
    dbMocks.selectWhereMock.mockImplementation(() => ({ limit: dbMocks.selectLimitMock }));
    dbMocks.updateWhereMock.mockImplementation(() => ({ returning: dbMocks.updateReturningMock }));
    dbMocks.insertReturningMock.mockResolvedValue([]);
    dbMocks.updateReturningMock.mockResolvedValue([]);
    dbMocks.selectLimitMock.mockResolvedValue([]);
  });

  describe("rowToPrinter — mapeo de isDefault", () => {
    it("mapea isDefault=true desde la fila", async () => {
      const row = buildPrinterRow({ id: "p-1", role: "receipt", isDefault: true });
      dbMocks.selectMock.mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([row]) }),
      });

      const result = await printerDrizzleRepository.list();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;

      expect(result.value[0]!.isDefault).toBe(true);
    });

    it("mapea isDefault=false cuando la fila tiene false", async () => {
      const row = buildPrinterRow({ id: "p-1", role: "receipt", isDefault: false });
      dbMocks.selectMock.mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([row]) }),
      });

      const result = await printerDrizzleRepository.list();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;

      expect(result.value[0]!.isDefault).toBe(false);
    });

    it("carga isDefault=false cuando la columna no se especificó al crear", async () => {
      const createdRow = buildPrinterRow({ id: "p-1", role: "receipt", isDefault: false });
      dbMocks.insertReturningMock.mockResolvedValueOnce([createdRow]);

      const result = await printerDrizzleRepository.create({
        name: "Caja",
        type: "network",
        address: "192.168.1.1:9100",
        role: PRINTER_ROLE.RECEIPT,
      });

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;

      expect(result.value.isDefault).toBe(false);

      const inserted = dbMocks.insertValuesMock.mock.calls[0]![0] as Partial<PrinterRow>;
      expect(inserted.isDefault).toBe(false);
    });
  });

  describe("validación printerDefaultRoleInvalid (defense in depth)", () => {
    it("rechaza create con isDefault=true y role=comanda", async () => {
      const input: PrinterCreateInput = {
        name: "Cocina",
        type: "network",
        address: "192.168.1.1:9100",
        role: "comanda",
        isDefault: true,
      };

      const result = await printerDrizzleRepository.create(input);

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        throw new Error("Expected create to fail");
      }

      expect(result.error).toBeInstanceOf(PrinterValidationError);
      expect(result.error.code).toBe("printerDefaultRoleInvalid");
      expect(dbMocks.insertMock).not.toHaveBeenCalled();
    });

    it("rechaza update con isDefault=true y role=comanda", async () => {
      const result = await printerDrizzleRepository.update("printer-1", {
        name: "Barra",
        type: "usb",
        address: "04b8:0e15",
        role: "comanda",
        isDefault: true,
      });

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        throw new Error("Expected update to fail");
      }

      expect(result.error.code).toBe("printerDefaultRoleInvalid");
    });
  });

  describe("invariant 'solo un default receipt'", () => {
    it("create con isDefault=true desmarca la default receipt anterior antes de insertar", async () => {
      const generatedId = "new-id-0000-0000-0000-000000000000";
      spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId as `${string}-${string}-${string}-${string}-${string}`);
      dbMocks.updateWhereMock.mockResolvedValueOnce(undefined);
      const createdRow = buildPrinterRow({ id: generatedId, role: "receipt", isDefault: true });
      dbMocks.insertReturningMock.mockResolvedValueOnce([createdRow]);

      const result = await printerDrizzleRepository.create({
        name: "Caja 2",
        type: "network",
        address: "192.168.1.2:9100",
        role: PRINTER_ROLE.RECEIPT,
        isDefault: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;

      expect(dbMocks.updateMock).toHaveBeenCalledTimes(1);
      expect(dbMocks.insertMock).toHaveBeenCalledTimes(1);

      const unsetPayload = dbMocks.updateSetMock.mock.calls[0]![0] as Partial<PrinterRow>;
      expect(unsetPayload.isDefault).toBe(false);

      const inserted = dbMocks.insertValuesMock.mock.calls[0]![0] as Partial<PrinterRow>;
      expect(inserted.isDefault).toBe(true);
    });

    it("create con isDefault=false NO desmarca defaults previos", async () => {
      const generatedId = "new-id-2-0000-0000-0000-000000000000";
      spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId as `${string}-${string}-${string}-${string}-${string}`);
      const createdRow = buildPrinterRow({ id: generatedId, role: "comanda", isDefault: false });
      dbMocks.insertReturningMock.mockResolvedValueOnce([createdRow]);

      const result = await printerDrizzleRepository.create({
        name: "Cocina",
        type: "network",
        address: "192.168.1.3:9100",
        role: "comanda",
        isDefault: false,
      });

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;

      expect(dbMocks.updateMock).not.toHaveBeenCalled();
      expect(dbMocks.insertMock).toHaveBeenCalledTimes(1);
    });

    it("update con isDefault=true desmarca la default receipt anterior excluyendo la editada", async () => {
      const existingRow = buildPrinterRow({ id: "printer-1", role: "receipt", isDefault: false });
      dbMocks.selectLimitMock.mockResolvedValueOnce([existingRow]);
      dbMocks.updateWhereMock.mockResolvedValueOnce(undefined);
      const updatedRow = buildPrinterRow({ id: "printer-1", role: "receipt", isDefault: true });
      dbMocks.updateReturningMock.mockResolvedValueOnce([updatedRow]);

      const result = await printerDrizzleRepository.update("printer-1", {
        name: "Caja 1",
        type: "network",
        address: "192.168.1.1:9100",
        role: PRINTER_ROLE.RECEIPT,
        isDefault: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;

      expect(dbMocks.updateMock).toHaveBeenCalledTimes(2);

      const firstCallPayload = dbMocks.updateSetMock.mock.calls[0]![0] as Partial<PrinterRow>;
      expect(firstCallPayload.isDefault).toBe(false);

      const secondCallPayload = dbMocks.updateSetMock.mock.calls[1]![0] as Partial<PrinterRow>;
      expect(secondCallPayload.isDefault).toBe(true);
    });

    it("update con isDefault=false NO desmarca defaults previos", async () => {
      const existingRow = buildPrinterRow({ id: "printer-1", role: "receipt", isDefault: false });
      dbMocks.selectLimitMock.mockResolvedValueOnce([existingRow]);
      const updatedRow = buildPrinterRow({ id: "printer-1", role: "receipt", isDefault: false });
      dbMocks.updateReturningMock.mockResolvedValueOnce([updatedRow]);

      const result = await printerDrizzleRepository.update("printer-1", {
        name: "Caja 1",
        type: "network",
        address: "192.168.1.1:9100",
        role: PRINTER_ROLE.RECEIPT,
        isDefault: false,
      });

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;

      expect(dbMocks.updateMock).toHaveBeenCalledTimes(1);
    });
  });
});