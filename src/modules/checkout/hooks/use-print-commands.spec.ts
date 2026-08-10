import { describe, expect, it, mock, beforeEach } from "bun:test";
import type { Mock } from "bun:test";

mock.module("@/modules/printer", () => ({
  usePrinters: mock(() => ({ data: [] })),
}));

mock.module("@/modules/settings", () => ({
  useSettingsStore: mock((selector: (state: { comandaHeaderText: string }) => string) =>
    selector({ comandaHeaderText: "COMANDA" }),
  ),
}));

mock.module("@/modules/checkout/lib/build-kitchen-commands", () => ({
  buildKitchenCommands: mock(() => []),
}));

mock.module("@/modules/checkout/adapters/print-command.adapter", () => ({
  printCommand: mock(() => Promise.resolve({ isOk: () => true, isErr: () => false, error: null })),
}));

import { renderHook } from "@testing-library/react";
import { usePrintCommands } from "./use-print-commands";
import { usePrinters } from "@/modules/printer";
import { buildKitchenCommands } from "@/modules/checkout/lib/build-kitchen-commands";
import { buildCartItem } from "@/modules/order/test/factories";
import { buildCategory } from "@/modules/menu/test/factories";
import { buildPrinter } from "@/modules/printer/test/factories";

const mockUsePrinters = usePrinters as Mock<(...args: unknown[]) => unknown>;
const mockBuildKitchenCommands = buildKitchenCommands as Mock<(...args: unknown[]) => unknown>;

describe("usePrintCommands", () => {
  const mockCategory = buildCategory({ printerId: "printer-1" });
  const mockPrinter = buildPrinter();
  const mockCartItem = buildCartItem({ quantity: 2 });

  beforeEach(() => {
    mockUsePrinters.mockReturnValue({ data: [mockPrinter] });
    mockBuildKitchenCommands.mockReturnValue([]);
  });

  it("receives categories in options and passes them to buildKitchenCommands", async () => {
    const { result } = renderHook(() =>
      usePrintCommands({ enabled: true, categories: [mockCategory] }),
    );

    await result.current.printCommands([mockCartItem]);

    expect(mockBuildKitchenCommands).toHaveBeenCalledWith(
      expect.any(Array),
      [mockPrinter],
      [mockCategory],
      "COMANDA",
    );
  });

  it("maps CartItem to CartLine including product.categoryId", async () => {
    const { result } = renderHook(() =>
      usePrintCommands({ enabled: true, categories: [mockCategory] }),
    );

    await result.current.printCommands([mockCartItem]);

    const cartLines = mockBuildKitchenCommands.mock.calls[0][0] as Array<{ product: { categoryId: string } }>;
    expect(cartLines).toHaveLength(1);
    expect(cartLines[0]).toMatchObject({
      product: { id: mockCartItem.product.id, name: mockCartItem.product.name, categoryId: mockCartItem.product.categoryId },
      quantity: 2,
    });
  });

  it("uses usePrinters to obtain printers", async () => {
    const { result } = renderHook(() =>
      usePrintCommands({ enabled: false, categories: [mockCategory] }),
    );

    expect(mockUsePrinters).toHaveBeenCalledWith({ enabled: false });

    await result.current.printCommands([mockCartItem]);

    expect(mockBuildKitchenCommands).toHaveBeenCalledWith(
      expect.any(Array),
      [mockPrinter],
      [mockCategory],
      "COMANDA",
    );
  });
});
