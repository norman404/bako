import { ResultAsync } from "neverthrow";

import { printOrder, type PrintOrderOptions } from "@/modules/checkout";
import type { Printer } from "@/modules/printer";
import type { OrderDetail } from "@/modules/shift-reports/domain/order-management";

function toPrintPaymentMethod(method: string): "cash" | "card" {
  const normalized = method.trim().toLowerCase();
  if (normalized === "cash" || normalized === "card") {
    return normalized;
  }
  return "cash";
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
    paymentMethod: toPrintPaymentMethod(orderDetail.paymentMethod),
    paymentAmount: orderDetail.paymentAmount,
    fulfillmentType: orderDetail.fulfillmentType === "delivery" ? "delivery" : "local",
    customer: orderDetail.customer
      ? {
          name: orderDetail.customer.name,
          phone: orderDetail.customer.phone,
          address: orderDetail.customer.address,
        }
      : null,
  };

  return printOrder(options, defaultReceiptPrinter);
}
