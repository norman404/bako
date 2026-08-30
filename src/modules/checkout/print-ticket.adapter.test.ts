import { describe, expect, it } from "vitest";

import type { PrintOrderOptions } from "./print-ticket";
import { buildPrintTicketPayload } from "./print-ticket.adapter";

const INPUT: PrintOrderOptions = {
  orderName: "Mesa 4",
  ticketNumber: 12,
  createdAt: new Date("2026-01-01T12:00:00Z"),
  total: 1_000,
  items: [],
  payments: [],
};

describe("buildPrintTicketPayload", () => {
  // CASE: A named order is printed on the sale receipt.
  // VALIDATES: The Tauri ticket payload carries the name separately from ticket metadata.
  it("should include the order name in the ticket payload when printing a named order", () => {
    // Arrange
    const printerType = "usb";
    const printerAddress = "1234:5678";

    // Act
    const payload = buildPrintTicketPayload(INPUT, printerType, printerAddress);

    // Assert
    expect(payload.orderName).toBe("Mesa 4");
  });
});
