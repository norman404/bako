import { describe, expect, it } from "vitest";

import type { Product } from "@/modules/menu";
import type { CartItem } from "@/modules/order";
import { buildCreateOrderInput, CHECKOUT_PAYMENT_MODE } from "./builders";

const PRODUCT: Product = {
  id: "coffee",
  categoryId: "drinks",
  menuIds: ["main"],
  name: "Coffee",
  description: "",
  price: 1_000,
  costPrice: 400,
  prepTimeMinutes: 1,
  image: "",
  isPopular: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  deletedAt: null,
};

const ITEMS: CartItem[] = [
  {
    lineId: "line-1",
    product: PRODUCT,
    quantity: 1,
    selectedModifiers: [],
  },
];

describe("buildCreateOrderInput", () => {
  // CASE: The cashier names the open cart before charging it.
  // VALIDATES: Checkout payload preserves the order name alongside items and payments.
  it("should include the order name when building the checkout payload", () => {
    // Arrange
    const orderName = "Mesa 4";

    // Act
    const result = buildCreateOrderInput(
      ITEMS,
      CHECKOUT_PAYMENT_MODE.CASH,
      "10.00",
      1_000,
      orderName,
    );

    // Assert
    expect(result?.orderName).toBe(orderName);
  });
});
