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

function createOrder(items: ShiftReportOrderItem[], isVoided = false) {
  return { isVoided, items };
}

describe("aggregateCategorySales", () => {
  // CASE: A shift sells several products from the same and different categories at different prices.
  // VALIDATES: The summary groups products by category and accumulates both units and line totals.
  it("should group products by category and accumulate units and sales when orders contain repeated products", () => {
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
        products: [
          { productId: "burger", productName: "Hamburguesa", quantity: 3, totalSales: 500 },
          { productId: "fries", productName: "Papas", quantity: 1, totalSales: 80 },
        ],
      },
      {
        categoryId: "drinks",
        categoryName: "Bebidas",
        totalItems: 2,
        totalSales: 100,
        products: [
          { productId: "soda", productName: "Refresco", quantity: 2, totalSales: 100 },
        ],
      },
    ]);
  });

  // CASE: A shift contains a voided order and products whose category no longer exists in the catalog.
  // VALIDATES: Voided sales are excluded and all missing categories share one uncategorized block.
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
      createOrder([createItem("coffee", "Café", null, null, 10, 35)], true),
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
        products: [
          { productId: "coffee", productName: "Café", quantity: 2, totalSales: 70 },
          { productId: "juice", productName: "Jugo", quantity: 1, totalSales: 25 },
          { productId: "tea", productName: "Té", quantity: 1, totalSales: 40 },
          { productId: "water", productName: "Agua", quantity: 2, totalSales: 20 },
        ],
      },
    ]);
  });

  // CASE: A shift has no orders with sellable items.
  // VALIDATES: The report exposes no empty category blocks.
  it("should return no categories when there are no sellable items", () => {
    // Arrange
    const orders = [createOrder([]), createOrder([createItem("burger", "Hamburguesa", "food", "Comida", 1, 150)], true)];

    // Act
    const result = aggregateCategorySales(orders);

    // Assert
    expect(result).toEqual([]);
  });
});
