import type { Printer } from "@/modules/printer/domain/printer";
import { PRINTER_TYPE, PRINTER_ROLE, PRINTER_LABEL_LANGUAGE } from "@/modules/printer/domain/printer";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

export function buildPrinter(overrides: Partial<Printer> = {}): Printer {
  return {
    id: "printer-1",
    name: "Cocina",
    type: PRINTER_TYPE.NETWORK,
    address: "192.168.1.100:9100",
    role: PRINTER_ROLE.COMANDA,
    isDefault: false,
    labelWidthMm: 40,
    labelHeightMm: 30,
    labelGapMm: 2,
    labelLanguage: PRINTER_LABEL_LANGUAGE.TSPL,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}