import { describe, expect, it } from "vitest";

import type { PrintCommandOptions } from "./print-command";
import { buildPrintCommandPayload } from "./print-command.adapter";

const INPUT: PrintCommandOptions = {
  orderName: "Mesa 4",
  headerText: "COMANDA",
  items: [],
  destination: {
    printerType: "label",
    printerAddress: "1234:5678",
  },
};

describe("buildPrintCommandPayload", () => {
  // CASE: A named order is sent to a product printer.
  // VALIDATES: The Tauri command payload carries the order name separately from the kitchen header.
  it("should include the order name in the product print payload when sending a named order", () => {
    // Arrange
    // Act
    const payload = buildPrintCommandPayload(INPUT);

    // Assert
    expect(payload.orderName).toBe("Mesa 4");
    expect(payload.headerText).toBe("COMANDA");
  });
});
