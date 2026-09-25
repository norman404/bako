import { collapseModifiersForPrint } from "@/modules/menu";
import type { CartItem, CartPricing } from "@/modules/order";

import type { PrintOrderDiscount, PrintOrderItem } from "../print-ticket";

export interface ReceiptLines {
  items: PrintOrderItem[];
  discounts: PrintOrderDiscount[];
}

// One printed line per priced segment, so the printed lines add up to the charged total.
export function buildReceiptLines(items: CartItem[], pricing: CartPricing): ReceiptLines {
  const itemsByLineId = new Map(items.map((item) => [item.lineId, item]));
  const namesByRef = new Map(pricing.applications.map((application) => [application.ref, application.name]));

  return {
    items: pricing.segments.map((segment) => {
      const item = itemsByLineId.get(segment.lineId);
      return {
        name: item?.product.name ?? "Producto",
        quantity: segment.quantity,
        unitPrice: segment.unitPrice,
        modifiers: collapseModifiersForPrint(item?.selectedModifiers ?? []),
        discount: segment.discountAmount,
        discountLabel: segment.applicationRef ? (namesByRef.get(segment.applicationRef) ?? null) : null,
        children: (item?.composite?.components ?? []).map((component) => ({
          name: component.product.name,
          quantity: component.quantity * segment.quantity,
        })),
      };
    }),
    discounts: pricing.applications.map((application) => ({
      name: application.name,
      amount: application.discountAmount,
    })),
  };
}
