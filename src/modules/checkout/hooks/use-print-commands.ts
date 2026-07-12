import { usePrinters } from "@/modules/printer/hooks/use-printers";
import type { Category } from "@/modules/menu/domain/category";
import type { CartItem } from "@/modules/order/domain/cart";
import { groupCartItemsByPrinter } from "@/modules/checkout/lib/group-cart-items-by-printer";
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
    printCommands: async (cartItems: CartItem[], categories: Category[], context: PrintCommandsInput) => {
      const commands = groupCartItemsByPrinter(
        cartItems.map((item) => ({
          product: {
            id: item.product.id,
            name: item.product.name,
            categoryId: item.product.categoryId,
          },
          quantity: item.quantity,
          selectedModifiers: item.selectedModifiers,
        })),
        categories,
        printers,
        context,
      );

      const results = await Promise.all(commands.map((command) => printCommand(command)));
      const errors = results.filter((result) => result.isErr()).map((result) => result.error);

      return errors;
    },
  };
}
