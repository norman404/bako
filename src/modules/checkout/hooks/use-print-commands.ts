import { usePrinters } from "@/modules/printer/hooks/use-printers";
import type { CartItem } from "@/modules/order/domain/cart";
import { buildKitchenCommands } from "@/modules/checkout/lib/build-kitchen-commands";
import { printCommand } from "@/modules/checkout/adapters/print-command.adapter";
import type { PrintCommandFulfillmentType } from "@/modules/checkout/domain/print-command";

export interface PrintCommandsInput {
  ticketNumber: number;
  createdAt: Date;
  fulfillmentType: PrintCommandFulfillmentType;
  customer: { name: string; phone: string; address: string } | null;
}

export interface UsePrintCommandsOptions {
  enabled?: boolean;
}

export function usePrintCommands(options: UsePrintCommandsOptions = {}) {
  const { enabled = true } = options;
  const { data: printers = [] } = usePrinters({ enabled });

  return {
    printCommands: async (cartItems: CartItem[], context: PrintCommandsInput) => {
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
        context,
      );

      const results = await Promise.all(commands.map((command) => printCommand(command)));
      const errors = results.filter((result) => result.isErr()).map((result) => result.error);

      return errors;
    },
  };
}
