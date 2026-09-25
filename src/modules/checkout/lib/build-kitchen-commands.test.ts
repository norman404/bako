import { describe, expect, it } from "vitest";

import type { Category } from "@/modules/menu";
import type { Printer } from "@/modules/printer";
import { buildKitchenCommands, type CartLine } from "./build-kitchen-commands";

const PRINTER: Printer = {
  id: "kitchen-printer",
  name: "Kitchen",
  type: "usb",
  address: "1234:5678",
  role: "comanda",
  isDefault: true,
  labelWidthMm: 40,
  labelHeightMm: 30,
  labelGapMm: 2,
  labelLanguage: "tspl",
  labelOrientation: "landscape",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  deletedAt: null,
};

const CATEGORY: Category = {
  id: "food",
  name: "Food",
  description: "",
  color: null,
  menuId: null,
  printerId: PRINTER.id,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  deletedAt: null,
};

const LINES: CartLine[] = [
  {
    product: { id: "burger", name: "Burger", categoryId: CATEGORY.id },
    quantity: 1,
    selectedModifiers: [],
  },
];

describe("buildKitchenCommands", () => {
  // CASE: The cashier names an order that is sent to a product printer.
  // VALIDATES: Every generated kitchen command carries the order name separately from its header.
  it("should include the order name in product print commands", () => {
    // Arrange
    const orderName = "Mesa 4";

    // Act
    const commands = buildKitchenCommands(LINES, [PRINTER], [CATEGORY], "COMANDA", orderName);

    // Assert
    expect(commands[0]?.orderName).toBe(orderName);
  });
});
