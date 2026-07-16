import { describe, expect, it } from "vitest";

import { PrinterNotFoundError, PrinterValidationError } from "./errors";

describe("printer domain errors", () => {
  it("PrinterNotFoundError carries a translatable code and params", () => {
    const error = new PrinterNotFoundError("printer-1");

    expect(error.kind).toBe("PrinterDomainError");
    expect(error.code).toBe("printerNotFound");
    expect(error.params).toEqual({ printerId: "printer-1" });
    expect(error.message).toContain("printer-1");
  });

  it("PrinterValidationError carries a translatable code", () => {
    const error = new PrinterValidationError("printerNameRequired");

    expect(error.code).toBe("printerNameRequired");
    expect(error.name).toBe("PrinterValidationError");
  });
});
