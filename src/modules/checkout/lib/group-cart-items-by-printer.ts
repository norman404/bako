import type { Category } from "@/modules/menu/domain/category";
import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";
import type { Printer } from "@/modules/printer/domain/printer";
import type { PrintCommandItem, PrintCommandOptions } from "@/modules/checkout/domain/print-command";

interface CartLine {
  product: { id: string; name: string; categoryId: string };
  quantity: number;
  selectedModifiers: SelectedModifier[];
}

interface CommandContext {
  ticketNumber: number;
  createdAt: Date;
  fulfillmentType: "local" | "delivery";
  customer: { name: string; phone: string; address: string } | null;
}

function toCommandItem(line: CartLine): PrintCommandItem {
  return {
    name: line.product.name,
    quantity: line.quantity,
    modifiers: line.selectedModifiers.map((modifier) => ({
      groupName: modifier.groupName,
      optionName: modifier.optionName,
      textValue: modifier.textValue,
    })),
  };
}

export function groupCartItemsByPrinter(
  cartLines: CartLine[],
  categories: Category[],
  printers: Printer[],
  context: CommandContext,
): PrintCommandOptions[] {
  const printerById = new Map(printers.map((printer) => [printer.id, printer]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const linesByPrinter = new Map<Printer, CartLine[]>();

  for (const line of cartLines) {
    const category = categoryById.get(line.product.categoryId);
    if (!category?.printerId) {
      continue;
    }

    const printer = printerById.get(category.printerId);
    if (!printer) {
      continue;
    }

    const bucket = linesByPrinter.get(printer) ?? [];
    bucket.push(line);
    linesByPrinter.set(printer, bucket);
  }

  const options: PrintCommandOptions[] = [];

  for (const [printer, lines] of linesByPrinter) {
    options.push({
      ticketNumber: context.ticketNumber,
      createdAt: context.createdAt,
      items: lines.map(toCommandItem),
      fulfillmentType: context.fulfillmentType,
      customer: context.customer,
      destination: {
        printerType: printer.type,
        printerAddress: printer.address,
      },
    });
  }

  return options;
}
