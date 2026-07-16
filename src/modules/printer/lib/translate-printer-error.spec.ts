import { describe, expect, it } from "vitest";
import i18next from "i18next";

import { PrinterNotFoundError, PrinterValidationError } from "@/modules/printer/domain/errors";

import { translatePrinterError } from "./translate-printer-error";

const testI18n = i18next.createInstance();
testI18n.init({
  lng: "es-MX",
  resources: {
    "es-MX": {
      errors: {
        printer: {
          printerNotFound: "Impresora no encontrada: {{printerId}}",
          printerNameRequired: "El nombre de la impresora es obligatorio.",
          generic: "Ocurrió un error con las impresoras.",
        },
      },
    },
  },
});

const t = testI18n.getFixedT("es-MX", "errors");

describe("translatePrinterError", () => {
  it("translates a printer not found error", () => {
    const error = new PrinterNotFoundError("printer-1");
    expect(translatePrinterError(error, t)).toBe("Impresora no encontrada: printer-1");
  });

  it("translates a validation error", () => {
    const error = new PrinterValidationError("printerNameRequired");
    expect(translatePrinterError(error, t)).toBe("El nombre de la impresora es obligatorio.");
  });

  it("falls back to generic for non-printer errors", () => {
    expect(translatePrinterError(new Error("boom"), t)).toBe("Ocurrió un error con las impresoras.");
  });
});
