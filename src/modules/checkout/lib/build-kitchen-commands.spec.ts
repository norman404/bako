import { describe, expect, it } from "bun:test";

import { buildKitchenCommands, type CartLine } from "./build-kitchen-commands";
import { buildPrinter } from "@/modules/printer/test/factories";
import { buildCategory } from "@/modules/menu/test/factories";
import { buildSelectedModifier } from "@/modules/menu/test/factories";
import type { Category, SelectedModifier } from "@/modules/menu";

function buildLine(overrides: {
  product?: Partial<{ id: string; name: string; categoryId: string | null }>;
  quantity?: number;
  selectedModifiers?: SelectedModifier[];
} = {}): CartLine {
  return {
    product: {
      id: overrides.product?.id ?? "prod-1",
      name: overrides.product?.name ?? "Taco",
      categoryId: overrides.product?.categoryId ?? null,
    },
    quantity: overrides.quantity ?? 1,
    selectedModifiers: overrides.selectedModifiers ?? [],
  };
}

const HEADER_TEXT = "COMANDA";

describe("buildKitchenCommands — routing por category.printerId", () => {
  it("categoría con printerId asignado enruta un comando por unidad a esa impresora", () => {
    const printer = buildPrinter({ id: "p-1", address: "192.168.1.10:9100" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-1" }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: "cat-1" }, quantity: 2 }),
    ];

    const result = buildKitchenCommands(lines, [printer], categories, HEADER_TEXT);

    // quantity=2 → 2 comandos, cada uno con 1 item (quantity=1)
    expect(result).toHaveLength(2);
    for (const cmd of result) {
      expect(cmd.destination.printerAddress).toBe(printer.address);
      expect(cmd.items).toHaveLength(1);
      expect(cmd.items[0]).toEqual({ name: "Taco", quantity: 1, modifiers: [] });
    }
  });

  it("categoría con printerId=null → array vacío", () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: null }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: "cat-1" }, quantity: 1 }),
    ];

    const result = buildKitchenCommands(lines, [printer], categories, HEADER_TEXT);

    expect(result).toEqual([]);
  });

  it("printerId de la categoría no está en la lista de printers → item omitido (array vacío)", () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-missing" }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: "cat-1" }, quantity: 1 }),
    ];

    const result = buildKitchenCommands(lines, [printer], categories, HEADER_TEXT);

    expect(result).toEqual([]);
  });

  it("dos categorías con la misma impresora → un comando por producto (no agrupados)", () => {
    const printer = buildPrinter({ id: "p-1", address: "192.168.1.10:9100" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-1" }),
      buildCategory({ id: "cat-2", printerId: "p-1" }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: "cat-1" }, quantity: 1 }),
      buildLine({ product: { id: "prod-2", name: "Agua", categoryId: "cat-2" }, quantity: 1 }),
    ];

    const result = buildKitchenCommands(lines, [printer], categories, HEADER_TEXT);

    // 2 productos → 2 comandos, cada uno con 1 item
    expect(result).toHaveLength(2);
    expect(result[0]?.destination.printerAddress).toBe(printer.address);
    expect(result[0]?.items).toHaveLength(1);
    expect(result[1]?.items).toHaveLength(1);
    const names = result.map((c) => c.items[0]?.name).sort();
    expect(names).toEqual(["Agua", "Taco"]);
  });

  it("dos categorías con distintas impresoras → dos comandos, cada uno con su item", () => {
    const printerA = buildPrinter({ id: "p-1", address: "192.168.1.10:9100" });
    const printerB = buildPrinter({ id: "p-2", address: "192.168.1.20:9100" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-1" }),
      buildCategory({ id: "cat-2", printerId: "p-2" }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: "cat-1" }, quantity: 1 }),
      buildLine({ product: { id: "prod-2", name: "Agua", categoryId: "cat-2" }, quantity: 1 }),
    ];

    const result = buildKitchenCommands(lines, [printerA, printerB], categories, HEADER_TEXT);

    expect(result).toHaveLength(2);
    const cmdA = result.find((c) => c.destination.printerAddress === printerA.address);
    const cmdB = result.find((c) => c.destination.printerAddress === printerB.address);
    expect(cmdA?.items).toHaveLength(1);
    expect(cmdA?.items[0]?.name).toBe("Taco");
    expect(cmdB?.items).toHaveLength(1);
    expect(cmdB?.items[0]?.name).toBe("Agua");
  });

  it("item con quantity=4 → cuatro comandos, uno por unidad", () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-1" }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: "cat-1" }, quantity: 4 }),
    ];

    const result = buildKitchenCommands(lines, [printer], categories, HEADER_TEXT);

    // quantity=4 → 4 comandos, cada uno con 1 item (quantity=1)
    expect(result).toHaveLength(4);
    for (const cmd of result) {
      expect(cmd.items).toHaveLength(1);
      expect(cmd.items[0]?.name).toBe("Taco");
      expect(cmd.items[0]?.quantity).toBe(1);
    }
  });

  it("impresoras role=comanda sin categoría asignada → array vacío (no broadcast por rol)", () => {
    const kitchenA = buildPrinter({ id: "k-1", role: "comanda" });
    const kitchenB = buildPrinter({ id: "k-2", role: "comanda" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: null }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: "cat-1" }, quantity: 1 }),
    ];

    const result = buildKitchenCommands(lines, [kitchenA, kitchenB], categories, HEADER_TEXT);

    expect(result).toEqual([]);
  });

  it("categoría asignada a impresora role=comanda → enruta igual (el routing lo define la categoría, no el rol)", () => {
    const barPrinter = buildPrinter({ id: "p-bar", role: "comanda", address: "192.168.1.30:9100" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-bar" }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Cerveza", categoryId: "cat-1" }, quantity: 2 }),
    ];

    const result = buildKitchenCommands(lines, [barPrinter], categories, HEADER_TEXT);

    // quantity=2 → 2 comandos
    expect(result).toHaveLength(2);
    for (const cmd of result) {
      expect(cmd.destination.printerAddress).toBe(barPrinter.address);
      expect(cmd.items).toHaveLength(1);
      expect(cmd.items[0]?.name).toBe("Cerveza");
      expect(cmd.items[0]?.quantity).toBe(1);
    }
  });

  it("cart vacía → array vacío", () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-1" }),
    ];

    const result = buildKitchenCommands([], [printer], categories, HEADER_TEXT);

    expect(result).toEqual([]);
  });

  it("preserva modifiers en cada comando expandido", () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-1" }),
    ];
    const salsa = buildSelectedModifier({
      groupName: "Salsa",
      optionName: "Roja",
      textValue: null,
    });
    const lines = [
      buildLine({
        product: { id: "prod-1", name: "Burrito", categoryId: "cat-1" },
        quantity: 3,
        selectedModifiers: [salsa],
      }),
    ];

    const result = buildKitchenCommands(lines, [printer], categories, HEADER_TEXT);

    // quantity=3 → 3 comandos, cada uno con los mismos modifiers
    expect(result).toHaveLength(3);
    for (const cmd of result) {
      expect(cmd.items).toHaveLength(1);
      expect(cmd.items[0]?.modifiers).toEqual([
        { groupName: "Salsa", optionName: "Roja", textValue: null },
      ]);
    }
  });

  it("propaga headerText al comando generado", () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-1" }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: "cat-1" }, quantity: 1 }),
    ];

    const result = buildKitchenCommands(lines, [printer], categories, "ENCABEZADO X");

    expect(result).toHaveLength(1);
    expect(result[0]?.headerText).toBe("ENCABEZADO X");
  });

  it("preserva el shape completo de destination (labelWidthMm/HeightMm/GapMm/Language)", () => {
    const printer = buildPrinter({
      id: "p-1",
      type: "network",
      address: "192.168.1.10:9100",
      labelWidthMm: 50,
      labelHeightMm: 40,
      labelGapMm: 3,
      labelLanguage: "zpl",
    });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-1" }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: "cat-1" }, quantity: 1 }),
    ];

    const result = buildKitchenCommands(lines, [printer], categories, HEADER_TEXT);

    expect(result).toHaveLength(1);
    expect(result[0]?.destination).toEqual({
      printerType: "network",
      printerAddress: "192.168.1.10:9100",
      labelWidthMm: 50,
      labelHeightMm: 40,
      labelGapMm: 3,
      labelLanguage: "zpl",
    });
  });

  it("item con categoryId=null no se imprime", () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories: Category[] = [
      buildCategory({ id: "cat-1", printerId: "p-1" }),
    ];
    const lines = [
      buildLine({ product: { id: "prod-1", name: "Taco", categoryId: null }, quantity: 1 }),
    ];

    const result = buildKitchenCommands(lines, [printer], categories, HEADER_TEXT);

    expect(result).toEqual([]);
  });
});
