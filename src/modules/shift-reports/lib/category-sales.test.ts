import { describe, expect, it } from "vitest";

import type { ShiftReportOrderItem } from "../shift";
import { aggregateCategorySales } from "./category-sales";

function createItem(
  productId: string,
  productName: string,
  categoryId: string | null,
  categoryName: string | null,
  quantity: number,
  unitPrice: number,
): ShiftReportOrderItem {
  return { productId, productName, categoryId, categoryName, quantity, unitPrice };
}

function createOrder(
  items: ShiftReportOrderItem[],
  {
    isVoided = false,
    isPending = false,
    channel = "local",
    total,
  }: { isVoided?: boolean; isPending?: boolean; channel?: string; total?: number } = {},
) {
  const catalogTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return { channel, isPending, isVoided, items, total: total ?? catalogTotal };
}

describe("aggregateCategorySales", () => {
  // CASE: A shift sells several products from the same and different categories at different prices.
  // VALIDATES: The summary exposes only the accumulated units and sales for each category.
  it("should aggregate units and sales by category when orders contain repeated products", () => {
    // Arrange
    const orders = [
      createOrder([
        createItem("burger", "Hamburguesa", "food", "Comida", 2, 150),
        createItem("fries", "Papas", "food", "Comida", 1, 80),
      ]),
      createOrder([
        createItem("burger", "Hamburguesa", "food", "Comida", 1, 200),
        createItem("soda", "Refresco", "drinks", "Bebidas", 2, 50),
      ]),
    ];

    // Act
    const result = aggregateCategorySales(orders);

    // Assert
    expect(result).toEqual([
      {
        categoryId: "food",
        categoryName: "Comida",
        totalItems: 4,
        totalSales: 580,
      },
      {
        categoryId: "drinks",
        categoryName: "Bebidas",
        totalItems: 2,
        totalSales: 100,
      },
    ]);
  });

  // CASE: A shift contains a voided order and products whose category no longer exists in the catalog.
  // VALIDATES: Voided sales are excluded and all missing categories share one uncategorized total.
  it("should exclude voided orders and combine missing categories when building the summary", () => {
    // Arrange
    const orders = [
      createOrder([
        createItem("coffee", "Café", null, null, 2, 35),
        createItem("juice", "Jugo", "missing-category-1", null, 1, 25),
      ]),
      createOrder([
        createItem("tea", "Té", null, null, 1, 40),
        createItem("water", "Agua", "missing-category-2", null, 2, 10),
      ]),
      createOrder([createItem("coffee", "Café", null, null, 10, 35)], { isVoided: true }),
    ];

    // Act
    const result = aggregateCategorySales(orders);

    // Assert
    expect(result).toEqual([
      {
        categoryId: null,
        categoryName: null,
        totalItems: 6,
        totalSales: 155,
      },
    ]);
  });

  // CASE: A shift has no orders with sellable items.
  // VALIDATES: The report exposes no empty category blocks.
  it("should return no categories when there are no sellable items", () => {
    // Arrange
    const orders = [createOrder([]), createOrder([createItem("burger", "Hamburguesa", "food", "Comida", 1, 150)], { isVoided: true })];

    // Act
    const result = aggregateCategorySales(orders);

    // Assert
    expect(result).toEqual([]);
  });
});

// CASE: Delivery line prices are catalog references while the order keeps the confirmed total.
// VALIDATES: Delivery is included and amount per category scales to the confirmed total, so the block matches the shift KPI.
it("should include confirmed delivery orders scaling category sales to the confirmed total", () => {
  // Arrange
  const coffee = [createItem("coffee", "Coffee", "drinks", "Drinks", 2, 7000)];
  const tea = [createItem("tea", "Tea", "drinks", "Drinks", 2, 5000)];

  // Act
  const categories = aggregateCategorySales([
    createOrder(coffee, { channel: "didi", total: 14000 }),
    createOrder(tea, { channel: "uber", total: 8000 }),
    createOrder(coffee, { channel: "didi", isPending: true }),
    createOrder(tea, { channel: "uber", isVoided: true }),
  ]);

  // Assert
  expect(categories).toEqual([
    { categoryId: "drinks", categoryName: "Drinks", totalItems: 4, totalSales: 22000 },
  ]);
});
