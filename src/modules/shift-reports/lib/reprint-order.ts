import { ResultAsync } from "neverthrow";

import { printOrder, type PrintOrderOptions } from "@/modules/checkout";
import type { Printer } from "@/modules/printer";
import type { OrderDetail } from "../order-management";

function toPrintPaymentMethod(method: string): "cash" | "card" {
  const normalized = method.trim().toLowerCase();
  return normalized === "card" ? "card" : "cash";
}

export function reprintOrder(
  orderDetail: OrderDetail,
  defaultReceiptPrinter: Printer | null,
): ResultAsync<void, Error> {
  const options: PrintOrderOptions = {
    ticketNumber: orderDetail.ticketNumber,
    createdAt: orderDetail.createdAt,
    total: orderDetail.total,
    items: orderDetail.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      modifiers: item.modifiers.map((mod) => ({
        groupName: mod.groupName,
        optionName: mod.optionName,
        textValue: mod.textValue,
      })),
    })),
    payments: orderDetail.payments.map((payment) => ({
      method: toPrintPaymentMethod(payment.method),
      amount: payment.amount,
      cashReceived: payment.cashReceived,
    })),
  };

  return printOrder(options, defaultReceiptPrinter);
}
