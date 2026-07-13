import { PRINTER_ROLE } from "@/modules/printer/domain/printer";
import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";
import type { Printer } from "@/modules/printer/domain/printer";
import type { PrintCommandItemModifier, PrintCommandOptions } from "@/modules/checkout/domain/print-command";

export interface CartLine {
  product: { id: string; name: string };
  quantity: number;
  selectedModifiers: SelectedModifier[];
}

function toCommandModifiers(line: CartLine): PrintCommandItemModifier[] {
  return line.selectedModifiers.map((modifier) => ({
    groupName: modifier.groupName,
    optionName: modifier.optionName,
    textValue: modifier.textValue,
  }));
}

export function buildKitchenCommands(
  cartLines: CartLine[],
  printers: Printer[],
  headerText: string,
): PrintCommandOptions[] {
  const kitchenPrinters = printers.filter((printer) => printer.role === PRINTER_ROLE.KITCHEN);

  if (kitchenPrinters.length === 0) {
    return [];
  }

  const options: PrintCommandOptions[] = [];

  for (const printer of kitchenPrinters) {
    for (const line of cartLines) {
      const modifiers = toCommandModifiers(line);

      for (let unit = 0; unit < line.quantity; unit++) {
        options.push({
          headerText,
          items: [{ name: line.product.name, quantity: 1, modifiers }],
          destination: {
            printerType: printer.type,
            printerAddress: printer.address,
          },
        });
      }
    }
  }

  return options;
}
