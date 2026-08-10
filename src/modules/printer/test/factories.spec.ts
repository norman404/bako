import { describe, expect, it } from "bun:test";
import { buildPrinter } from "./factories";
import { PRINTER_TYPE, PRINTER_ROLE, PRINTER_LABEL_LANGUAGE } from "../printer";

describe("buildPrinter", () => {
  it("generates a valid Printer with defaults", () => {
    const printer = buildPrinter();
    expect(printer.id).toBeDefined();
    expect(printer.id.length).toBeGreaterThan(0);
    expect(printer.name).toBeDefined();
    expect(printer.type).toBe(PRINTER_TYPE.NETWORK);
    expect(printer.address).toBeDefined();
    expect(printer.role).toBe(PRINTER_ROLE.COMANDA);
    expect(printer.isDefault).toBe(false);
    expect(printer.labelWidthMm).toBe(40);
    expect(printer.labelHeightMm).toBe(30);
    expect(printer.labelGapMm).toBe(2);
    expect(printer.labelLanguage).toBe(PRINTER_LABEL_LANGUAGE.TSPL);
    expect(printer.createdAt).toBeInstanceOf(Date);
    expect(printer.updatedAt).toBeInstanceOf(Date);
    expect(printer.deletedAt).toBeNull();
  });

  it("allows overriding specific fields", () => {
    const printer = buildPrinter({
      id: "custom-id",
      name: "Caja 1",
      role: PRINTER_ROLE.RECEIPT,
      isDefault: true,
    });
    expect(printer.id).toBe("custom-id");
    expect(printer.name).toBe("Caja 1");
    expect(printer.role).toBe(PRINTER_ROLE.RECEIPT);
    expect(printer.isDefault).toBe(true);
    expect(printer.type).toBe(PRINTER_TYPE.NETWORK);
    expect(printer.labelWidthMm).toBe(40);
  });

  it("allows overriding nested fields freely", () => {
    const printer = buildPrinter({
      type: PRINTER_TYPE.USB,
      address: "04b8:0e15",
      labelWidthMm: 60,
    });
    expect(printer.type).toBe(PRINTER_TYPE.USB);
    expect(printer.address).toBe("04b8:0e15");
    expect(printer.labelWidthMm).toBe(60);
  });
});