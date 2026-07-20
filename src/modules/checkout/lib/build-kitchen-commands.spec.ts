import { describe, expect, it } from "bun:test";

import { buildKitchenCommands } from "./build-kitchen-commands";
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

function buildLine(overrides: {
  product?: Partial<{ id: string; name: string }>;
  quantity?: number;
  selectedModifiers?: SelectedModifier[];
} = {}): {
  product: { id: string; name: string };
  quantity: number;
  selectedModifiers: SelectedModifier[];
} {
  return {
    product: {
      id: overrides.product?.id ?? "prod-1",
      name: overrides.product?.name ?? "Taco",
    },
    quantity: overrides.quantity ?? 1,
    selectedModifiers: overrides.selectedModifiers ?? [],
  };
}

const HEADER_TEXT = "COMANDA";

describe("buildKitchenCommands", () => {
  it("returns empty array when there are no printers at all", () => {
    const lines = [buildLine({ quantity: 2 })];

    const result = buildKitchenCommands(lines, [], HEADER_TEXT);

    expect(result).toHaveLength(0);
  });

  it("returns empty array when printers exist but none has role kitchen", () => {
    const printers = [
      buildPrinter({ id: "printer-receipt", role: "receipt" }),
      buildPrinter({ id: "printer-bar", role: "bar" }),
      buildPrinter({ id: "printer-other", role: "other" }),
    ];
    const lines = [buildLine({ quantity: 3 })];

    const result = buildKitchenCommands(lines, printers, HEADER_TEXT);

    expect(result).toHaveLength(0);
  });

  it("ignores non-kitchen printers even when a kitchen printer is also present", () => {
    const kitchenPrinter = buildPrinter({ id: "printer-kitchen", role: "kitchen" });
    const receiptPrinter = buildPrinter({ id: "printer-receipt", role: "receipt", address: "192.168.1.99:9100" });
    const lines = [buildLine({ quantity: 1 })];

    const result = buildKitchenCommands(lines, [kitchenPrinter, receiptPrinter], HEADER_TEXT);

    expect(result).toHaveLength(1);
    expect(result[0]?.destination.printerAddress).toBe(kitchenPrinter.address);
  });

  it("produces one command per unit of quantity for a single kitchen printer", () => {
    const kitchenPrinter = buildPrinter({ id: "printer-kitchen" });
    const taco = buildLine({ product: { id: "prod-taco", name: "Taco" }, quantity: 3 });

    const result = buildKitchenCommands([taco], [kitchenPrinter], HEADER_TEXT);

    expect(result).toHaveLength(3);
    for (const command of result) {
      expect(command.items).toHaveLength(1);
      expect(command.items[0]).toEqual({ name: "Taco", quantity: 1, modifiers: [] });
      expect(command.destination).toEqual({
        printerType: kitchenPrinter.type,
        printerAddress: kitchenPrinter.address,
      });
    }
  });

  it("produces one command per unit for each cart line combined, single kitchen printer", () => {
    const kitchenPrinter = buildPrinter({ id: "printer-kitchen" });
    const taco = buildLine({ product: { id: "prod-taco", name: "Taco" }, quantity: 2 });
    const water = buildLine({ product: { id: "prod-water", name: "Agua" }, quantity: 1 });

    const result = buildKitchenCommands([taco, water], [kitchenPrinter], HEADER_TEXT);

    expect(result).toHaveLength(3);
    expect(result.filter((command) => command.items[0]?.name === "Taco")).toHaveLength(2);
    expect(result.filter((command) => command.items[0]?.name === "Agua")).toHaveLength(1);
    for (const command of result) {
      expect(command.items).toHaveLength(1);
      expect(command.items[0]?.quantity).toBe(1);
    }
  });

  it("duplicates each unit's command across every kitchen printer", () => {
    const kitchenPrinterA = buildPrinter({ id: "printer-kitchen-a", address: "192.168.1.50:9100" });
    const kitchenPrinterB = buildPrinter({ id: "printer-kitchen-b", address: "192.168.1.51:9100" });
    const taco = buildLine({ product: { id: "prod-taco", name: "Taco" }, quantity: 2 });

    const result = buildKitchenCommands([taco], [kitchenPrinterA, kitchenPrinterB], HEADER_TEXT);

    expect(result).toHaveLength(4);
    expect(
      result.filter((command) => command.destination.printerAddress === kitchenPrinterA.address),
    ).toHaveLength(2);
    expect(
      result.filter((command) => command.destination.printerAddress === kitchenPrinterB.address),
    ).toHaveLength(2);
  });

  it("preserves modifiers on every expanded command for a line", () => {
    const kitchenPrinter = buildPrinter({ id: "printer-kitchen" });
    const burrito = buildLine({
      product: { id: "prod-burrito", name: "Burrito" },
      quantity: 2,
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

    const result = buildKitchenCommands([burrito], [kitchenPrinter], HEADER_TEXT);

    expect(result).toHaveLength(2);
    for (const command of result) {
      expect(command.items[0]?.modifiers).toEqual([{ groupName: "Salsa", optionName: "Roja", textValue: null }]);
    }
  });

  it("carries the given headerText into every generated command", () => {
    const kitchenPrinter = buildPrinter({ id: "printer-kitchen" });
    const taco = buildLine({ quantity: 1 });

    const result = buildKitchenCommands([taco], [kitchenPrinter], "ENCABEZADO PERSONALIZADO");

    expect(result).toHaveLength(1);
    expect(result[0]?.headerText).toBe("ENCABEZADO PERSONALIZADO");
  });

  it("uses the same headerText across multiple commands and printers", () => {
    const kitchenPrinterA = buildPrinter({ id: "printer-kitchen-a", address: "192.168.1.50:9100" });
    const kitchenPrinterB = buildPrinter({ id: "printer-kitchen-b", address: "192.168.1.51:9100" });
    const taco = buildLine({ quantity: 2 });

    const result = buildKitchenCommands([taco], [kitchenPrinterA, kitchenPrinterB], "COMANDA");

    expect(result).toHaveLength(4);
    for (const command of result) {
      expect(command.headerText).toBe("COMANDA");
    }
  });
});
