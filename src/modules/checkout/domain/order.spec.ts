import { describe, expect, it } from "vitest";

import { calculateOrderTotal } from "@/modules/checkout/domain/order";

describe("calculateOrderTotal", () => {
  it("sums unitPrice * quantity for plain items without modifiers", () => {
    const items = [
      { unitPrice: 5000, quantity: 2, modifiers: [] },
      { unitPrice: 3000, quantity: 1, modifiers: [] },
    ];

    expect(calculateOrderTotal(items)).toBe(5000 * 2 + 3000 * 1);
  });

  it("includes surcharge baked into unitPrice for items with modifiers", () => {
    // Per design.md:355 — unitPrice already includes surcharge (computed by builder).
    // calculateOrderTotal does NOT re-add priceDelta. Single modifier surcharge.
    const items = [
      { unitPrice: 5500, quantity: 2, modifiers: [{ priceDelta: 500 }] },
    ];

    expect(calculateOrderTotal(items)).toBe(5500 * 2);
  });

  it("includes multiple modifier surcharges baked into unitPrice", () => {
    const items = [
      { unitPrice: 5800, quantity: 1, modifiers: [{ priceDelta: 500 }, { priceDelta: 300 }] },
    ];

    expect(calculateOrderTotal(items)).toBe(5800 * 1);
  });

  it("sums multiple items with and without surcharges", () => {
    const items = [
      { unitPrice: 5500, quantity: 2, modifiers: [{ priceDelta: 500 }] }, // 11000
      { unitPrice: 5000, quantity: 3, modifiers: [] }, // 15000
    ];

    expect(calculateOrderTotal(items)).toBe(11000 + 15000);
  });

  it("returns 0 for empty item list", () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});