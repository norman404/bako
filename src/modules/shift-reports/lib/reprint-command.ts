import type { Category } from "@/modules/menu";
import type { Printer } from "@/modules/printer";
import { buildKitchenCommands, printCommand, type CartLine } from "@/modules/checkout";
import type { CommandItemSelection, OrderDetail, OrderDetailItem } from "@/modules/shift-reports/domain/order-management";

export interface ReprintCommandResult {
  printedCount: number;
  errors: Error[];
}

function toCartLine(item: OrderDetailItem, quantity: number): CartLine {
  return {
    product: {
      id: item.productId,
      name: item.productName,
      categoryId: item.categoryId,
    },
    quantity,
    selectedModifiers: item.modifiers.map((modifier) => ({
      groupId: modifier.groupId ?? "",
      groupName: modifier.groupName,
      optionId: modifier.optionId,
      optionName: modifier.optionName,
      priceDelta: modifier.priceDelta,
      textValue: modifier.textValue,
    })),
  };
}

function invalidCommandSelection(): ReprintCommandResult {
  return {
    printedCount: 0,
    errors: [new Error("Invalid command item selection")],
  };
}

function selectCartLines(
  orderDetail: OrderDetail,
  selections: CommandItemSelection[] | undefined,
): CartLine[] | ReprintCommandResult {
  if (selections === undefined) {
    return orderDetail.items.map((item) => toCartLine(item, item.quantity));
  }

  const itemsById = new Map(orderDetail.items.map((item) => [item.id, item]));
  const quantitiesByItemId = new Map<string, number>();

  for (const selection of selections) {
    const item = itemsById.get(selection.orderItemId);
    const isValidQuantity =
      Number.isInteger(selection.quantity) &&
      selection.quantity >= 1 &&
      selection.quantity <= (item?.quantity ?? 0);

    if (!item || !isValidQuantity || quantitiesByItemId.has(selection.orderItemId)) {
      return invalidCommandSelection();
    }

    quantitiesByItemId.set(selection.orderItemId, selection.quantity);
  }

  return orderDetail.items.flatMap((item) => {
    const quantity = quantitiesByItemId.get(item.id);
    return quantity === undefined ? [] : [toCartLine(item, quantity)];
  });
}

export async function reprintCommand(
  orderDetail: OrderDetail,
  printers: Printer[],
  categories: Category[],
  headerText: string,
  selections?: CommandItemSelection[],
): Promise<ReprintCommandResult> {
  const cartLines = selectCartLines(orderDetail, selections);
  if (!Array.isArray(cartLines)) {
    return cartLines;
  }

  const commands = buildKitchenCommands(cartLines, printers, categories, headerText);
  const results = await Promise.all(commands.map((command) => printCommand(command)));
  const errors = results.filter((result) => result.isErr()).map((result) => result.error);

  return { printedCount: commands.length, errors };
}
