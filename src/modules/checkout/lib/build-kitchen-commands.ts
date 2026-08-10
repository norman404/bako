import type { Category, SelectedModifier } from "@/modules/menu";
import type { Printer } from "@/modules/printer";
import type { PrintCommandItemModifier, PrintCommandOptions } from "@/modules/checkout/domain/print-command";

export interface CartLine {
  product: { id: string; name: string; categoryId: string | null };
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

function buildCategoryToPrinterMap(categories: Category[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const category of categories) {
    if (category.deletedAt === null && category.printerId !== null) {
      map.set(category.id, category.printerId);
    }
  }
  return map;
}

function groupLinesByPrinter(
  lines: CartLine[],
  categoryToPrinterMap: Map<string, string>,
  printerMap: Map<string, Printer>,
): Map<string, CartLine[]> {
  const grouped = new Map<string, CartLine[]>();
  for (const line of lines) {
    const categoryId = line.product.categoryId;
    if (categoryId === null) {
      continue;
    }
    const printerId = categoryToPrinterMap.get(categoryId);
    if (printerId === undefined) {
      continue;
    }
    if (!printerMap.has(printerId)) {
      continue;
    }
    const existing = grouped.get(printerId);
    if (existing !== undefined) {
      existing.push(line);
    } else {
      grouped.set(printerId, [line]);
    }
  }
  return grouped;
}

export function buildKitchenCommands(
  cartLines: CartLine[],
  printers: Printer[],
  categories: Category[],
  headerText: string,
): PrintCommandOptions[] {
  const printerMap = new Map<string, Printer>();
  for (const printer of printers) {
    printerMap.set(printer.id, printer);
  }

  const categoryToPrinterMap = buildCategoryToPrinterMap(categories);
  const grouped = groupLinesByPrinter(cartLines, categoryToPrinterMap, printerMap);

  const options: PrintCommandOptions[] = [];

  for (const [printerId, lines] of grouped) {
    const printer = printerMap.get(printerId);
    if (printer === undefined) {
      continue;
    }

    const destination = {
      printerType: printer.type,
      printerAddress: printer.address,
      labelWidthMm: printer.labelWidthMm,
      labelHeightMm: printer.labelHeightMm,
      labelGapMm: printer.labelGapMm,
      labelLanguage: printer.labelLanguage,
    };

    for (const line of lines) {
      const item = {
        name: line.product.name,
        quantity: 1,
        modifiers: toCommandModifiers(line),
      };

      for (let i = 0; i < line.quantity; i++) {
        options.push({
          headerText,
          items: [item],
          destination,
        });
      }
    }
  }

  return options;
}