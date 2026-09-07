import { describe, expect, it } from "vitest";
import { normalizeDeliveryReference, orderPrintName } from "./order-channel";

describe("delivery identification", () => {
  // CASE: A saved delivery is printed for the first time or reprinted after restarting.
  // VALIDATES: Its platform and reference remain visible without replacing the customer's stored name.
  it("should identify the platform and reference when preparing a label name", () => {
    // Arrange
    const reference = normalizeDeliveryReference("  APP-42\n ");
    // Act
    const label = orderPrintName("didi", reference, "Ana", 42);
    const fallback = orderPrintName("uber", null, null, 43);
    // Assert
    expect(label).toBe("DIDI APP-42 · Ana");
    expect(fallback).toBe("UBER #43");
    expect(orderPrintName("local", null, "Mesa 2", 44)).toBe("Mesa 2");
  });
});
