import { usePrinters } from "@/modules/printer/hooks/use-printers";
import type { CartItem } from "@/modules/order/domain/cart";
import { buildKitchenCommands } from "@/modules/checkout/lib/build-kitchen-commands";
import { printCommand } from "@/modules/checkout/adapters/print-command.adapter";
import { useSettingsStore } from "@/modules/settings/store/settings-store";

export interface UsePrintCommandsOptions {
  enabled?: boolean;
}

export function usePrintCommands(options: UsePrintCommandsOptions = {}) {
  const { enabled = true } = options;
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
          },
          quantity: item.quantity,
          selectedModifiers: item.selectedModifiers,
        })),
        printers,
        headerText,
      );

      const results = await Promise.all(commands.map((command) => printCommand(command)));
      const errors = results.filter((result) => result.isErr()).map((result) => result.error);

      return errors;
    },
  };
}
