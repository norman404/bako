import { usePrinters } from "@/modules/printer";
import type { CartItem } from "@/modules/order/domain/cart";
import type { Category } from "@/modules/menu/domain/category";
import { buildKitchenCommands } from "@/modules/checkout/lib/build-kitchen-commands";
import { printCommand } from "@/modules/checkout/adapters/print-command.adapter";
import { useSettingsStore } from "@/modules/settings";

export interface UsePrintCommandsOptions {
  enabled?: boolean;
  categories: Category[];
}

export function usePrintCommands(options: UsePrintCommandsOptions) {
  const { enabled = true, categories } = options;
  const { data: printers = [] } = usePrinters({ enabled });
  const comandaHeaderText = useSettingsStore((state) => state.comandaHeaderText);
  const headerText = comandaHeaderText?.trim() || "COMANDA";

  return {
    printCommands: async (cartItems: CartItem[]) => {
      const commands = buildKitchenCommands(
        cartItems.map((item) => ({
          product: {
            id: item.product.id,
            name: item.product.name,
            categoryId: item.product.categoryId,
          },
          quantity: item.quantity,
          selectedModifiers: item.selectedModifiers,
        })),
        printers,
        categories,
        headerText,
      );

      const results = await Promise.all(commands.map((command) => printCommand(command)));
      const errors = results.filter((result) => result.isErr()).map((result) => result.error);

      return errors;
    },
  };
}
