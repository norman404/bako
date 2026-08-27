import { describe, expect, it } from "vitest";

import type { Printer } from "@/modules/printer";
import type { ShiftReport } from "../shift";
import {
  buildReprintShiftReportPayload,
  type ReprintShiftReportLabels,
} from "./reprint-shift-report";

const PRINTER = {
  type: "usb",
  address: "usb://receipt",
} satisfies Pick<Printer, "type" | "address">;

const LABELS: ReprintShiftReportLabels = {
  title: "Reporte de turno",
  ordersLabel: "Órdenes",
  itemsLabel: "Productos vendidos",
  cashLabel: "Efectivo",
  cardLabel: "Tarjeta",
  totalLabel: "Total vendido",
  openingCashLabel: "Efectivo inicial",
  expectedCashLabel: "Esperado",
  countedCashLabel: "Contado",
  differenceLabel: "Diferencia",
  categorySalesLabel: "Ventas por categoría",
  uncategorizedCategoryLabel: "Sin categoría",
  itemCountLabel: "productos",
};

const REPORT: ShiftReport = {
  shiftId: "shift-1",
  openedAt: new Date("2026-08-01T08:00:00Z"),
  closedAt: new Date("2026-08-01T16:00:00Z"),
  totalOrders: 2,
  totalItems: 6,
  totalSales: 680,
  cashTotal: 680,
  cardTotal: 0,
  orders: [],
  salesByCategory: [
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
      categoryId: null,
      categoryName: null,
      totalItems: 2,
      totalSales: 100,
      products: [
        { productId: "soda", productName: "Refresco", quantity: 2, totalSales: 100 },
      ],
    },
  ],
  openingCash: 0,
  cashMovementsIn: 0,
  cashMovementsOut: 0,
  expectedCash: 680,
  countedCash: 680,
  cashDifference: 0,
  cashMovements: [],
};

describe("buildReprintShiftReportPayload", () => {
  // CASE: Categories are enabled for a shift report that contains category and product totals.
  // VALIDATES: The print payload carries a category heading, category totals, and product totals.
  it("should include category summary rows when categories are enabled", () => {
    // Arrange
    const categoriesEnabled = true;

    // Act
    const payload = buildReprintShiftReportPayload(REPORT, PRINTER, LABELS, categoriesEnabled);
    const itemNames = payload.items.map((item) => item.name);

    // Assert
    expect(itemNames).toContain("Ventas por categoría");
    expect(itemNames).toContain("Comida — 4 productos");
    expect(itemNames).toContain("  Hamburguesa — 3 productos");
    expect(itemNames).toContain("Sin categoría — 2 productos");
    expect(payload.items.find((item) => item.name === "Comida — 4 productos")?.unitPrice).toBe(580);
    expect(payload.items.find((item) => item.name === "  Hamburguesa — 3 productos")?.unitPrice).toBe(500);
  });

  // CASE: Categories are disabled while a report still has computed category data.
  // VALIDATES: Printing preserves the existing compact report and omits category rows.
  it("should omit category summary rows when categories are disabled", () => {
    // Arrange
    const categoriesEnabled = false;

    // Act
    const payload = buildReprintShiftReportPayload(REPORT, PRINTER, LABELS, categoriesEnabled);
    const itemNames = payload.items.map((item) => item.name);

    // Assert
    expect(itemNames).not.toContain("Ventas por categoría");
    expect(itemNames).not.toContain("Comida — 4 productos");
    expect(itemNames).not.toContain("  Hamburguesa — 3 productos");
  });
});
