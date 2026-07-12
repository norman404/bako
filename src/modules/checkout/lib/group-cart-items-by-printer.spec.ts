import { describe, expect, it } from "vitest";

import { groupCartItemsByPrinter } from "./group-cart-items-by-printer";
import type { Category } from "@/modules/menu/domain/category";
import type { Printer } from "@/modules/printer/domain/printer";
import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";

function buildPrinter(overrides: Partial<Printer> = {}): Printer {
  return {
    id: overrides.id ?? "printer-1",
    name: overrides.name ?? "Cocina",
    type: (overrides.type ?? "network") as Printer["type"],
    address: overrides.address ?? "192.168.1.50:9100",
    role: (overrides.role ?? "kitchen") as Printer["role"],
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: overrides.id ?? "cat-1",
    name: overrides.name ?? "Comidas",
    description: overrides.description ?? "Comidas",
    color: overrides.color ?? null,
    menuId: overrides.menuId ?? null,
    printerId: overrides.printerId ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

function buildLine(overrides: {
  product?: Partial<{ id: string; name: string; categoryId: string }>;
  quantity?: number;
  selectedModifiers?: SelectedModifier[];
} = {}): {
  product: { id: string; name: string; categoryId: string };
  quantity: number;
  selectedModifiers: SelectedModifier[];
} {
  return {
    product: {
      id: overrides.product?.id ?? "prod-1",
      name: overrides.product?.name ?? "Taco",
      categoryId: overrides.product?.categoryId ?? "cat-1",
    },
    quantity: overrides.quantity ?? 1,
    selectedModifiers: overrides.selectedModifiers ?? [],
  };
}

describe("groupCartItemsByPrinter", () => {
  it("returns empty array when no cart lines have a printer assigned", () => {
    const categories = [buildCategory({ id: "cat-1", printerId: null })];
    const printers = [buildPrinter({ id: "printer-1" })];
    const lines = [buildLine({ product: { categoryId: "cat-1" } })];

    const result = groupCartItemsByPrinter(lines, categories, printers, {
      ticketNumber: 42,
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
      fulfillmentType: "local",
      customer: null,
    });

    expect(result).toHaveLength(0);
  });

  it("groups lines by printer", () => {
    const kitchenPrinter = buildPrinter({ id: "printer-kitchen", name: "Cocina" });
    const barPrinter = buildPrinter({ id: "printer-bar", name: "Barra", address: "192.168.1.51:9100" });
    const categories = [
      buildCategory({ id: "cat-food", printerId: kitchenPrinter.id }),
      buildCategory({ id: "cat-drinks", printerId: barPrinter.id }),
    ];
    const printers = [kitchenPrinter, barPrinter];

    const taco = buildLine({
      product: { id: "prod-taco", name: "Taco", categoryId: "cat-food" },
      quantity: 2,
    });
    const soda = buildLine({
      product: { id: "prod-soda", name: "Gaseosa", categoryId: "cat-drinks" },
      quantity: 1,
    });

    const result = groupCartItemsByPrinter([taco, soda], categories, printers, {
      ticketNumber: 7,
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
      fulfillmentType: "local",
      customer: null,
    });

    expect(result).toHaveLength(2);

    const kitchenCommand = result.find((command) => command.destination.printerAddress === kitchenPrinter.address);
    expect(kitchenCommand).toBeDefined();
    expect(kitchenCommand?.items).toHaveLength(1);
    expect(kitchenCommand?.items[0]).toEqual({ name: "Taco", quantity: 2, modifiers: [] });

    const barCommand = result.find((command) => command.destination.printerAddress === barPrinter.address);
    expect(barCommand).toBeDefined();
    expect(barCommand?.items).toHaveLength(1);
    expect(barCommand?.items[0]).toEqual({ name: "Gaseosa", quantity: 1, modifiers: [] });
  });

  it("combines multiple lines into a single command when they share a printer", () => {
    const kitchenPrinter = buildPrinter({ id: "printer-kitchen" });
    const categories = [buildCategory({ id: "cat-food", printerId: kitchenPrinter.id })];
    const printers = [kitchenPrinter];

    const taco = buildLine({ product: { id: "prod-taco", name: "Taco", categoryId: "cat-food" }, quantity: 1 });
    const burrito = buildLine({
      product: { id: "prod-burrito", name: "Burrito", categoryId: "cat-food" },
      quantity: 1,
      selectedModifiers: [
        {
          groupId: "g1",
          groupName: "Salsa",
          optionId: "opt-1",
          optionName: "Roja",
          priceDelta: 0,
          textValue: null,
        },
      ],
    });

    const result = groupCartItemsByPrinter([taco, burrito], categories, printers, {
      ticketNumber: 7,
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
      fulfillmentType: "delivery",
      customer: { name: "Juan", phone: "5551234", address: "Calle 1" },
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.items).toHaveLength(2);
    expect(result[0]?.items[0]).toEqual({ name: "Taco", quantity: 1, modifiers: [] });
    expect(result[0]?.items[1]).toEqual({
      name: "Burrito",
      quantity: 1,
      modifiers: [{ groupName: "Salsa", optionName: "Roja", textValue: null }],
    });
    expect(result[0]?.fulfillmentType).toBe("delivery");
    expect(result[0]?.customer).toEqual({ name: "Juan", phone: "5551234", address: "Calle 1" });
  });
});
