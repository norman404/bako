import { errAsync, type ResultAsync } from "neverthrow";

import { printOrder, type PrintOrderOptions, type PrintOrderPayment } from "@/modules/checkout";
import { collapseModifiersForPrint } from "@/modules/menu";
import { ORDER_CHANNEL, orderPrintName } from "@/modules/order";
import type { Printer } from "@/modules/printer";
import type { OrderDetail } from "../order-management";

export function buildReprintOrderOptions(order: OrderDetail): PrintOrderOptions | null {
  if (order.isVoided || order.confirmedAt === null) return null;
  const payments: PrintOrderPayment[] = [];
  for (const payment of order.payments) {
    if (payment.method !== "cash" && payment.method !== "card" && payment.method !== "platform") return null;
    payments.push({ method: payment.method, amount: payment.amount, cashReceived: payment.cashReceived });
  }
  const items = order.channel === ORDER_CHANNEL.LOCAL
    ? order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        modifiers: collapseModifiersForPrint(item.modifiers),
        discount: item.discountAmount,
        discountLabel: item.promotionName,
        children: item.children.map((child) => ({ name: child.productName, quantity: child.quantity })),
      }))
    : [{
        name: order.channel === ORDER_CHANNEL.DIDI ? "DiDi" : "Uber Eats",
        quantity: 1,
        unitPrice: order.total,
        modifiers: order.items.flatMap((item) => [
          { groupName: `${item.quantity} x ${item.productName}`, optionName: null, textValue: null },
          ...collapseModifiersForPrint(item.modifiers),
        ]),
      }];

  return {
    orderName: orderPrintName(order.channel, order.deliveryReference, order.orderName, order.ticketNumber),
    ticketNumber: order.ticketNumber,
    createdAt: order.confirmedAt,
    total: order.total,
    items,
    payments,
    discounts: order.promotions.map((promotion) => ({ name: promotion.name, amount: promotion.discountAmount })),
  };
}

export function reprintOrder(order: OrderDetail, printer: Printer | null): ResultAsync<void, Error> {
  const options = buildReprintOrderOptions(order);
  return options ? printOrder(options, printer) : errAsync(new Error("Order is not a confirmed sale"));
}
