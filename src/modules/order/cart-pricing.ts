import { calculateItemUnitPrice } from "@/modules/menu";
import {
  APPLIED_PROMOTION_KIND,
  applyPromotions,
  type PricedCart,
  type PricedSegment,
  type Promotion,
  type PromotionApplication,
} from "@/modules/promotions";

import type { CartItem } from "./cart-operations";

export interface CartPricing extends PricedCart {
  itemsCount: number;
}

export interface CartLinePricing {
  grossTotal: number;
  discountAmount: number;
  netTotal: number;
  promotionNames: string[];
}

interface CompositePricing {
  segment: PricedSegment;
  application: PromotionApplication | null;
}

// The parent line is priced at the sum of its components so the saving is an explicit,
// auditable discount; a bundle priced above that sum is simply charged at its own price.
function priceComposite(item: CartItem, ref: string, applyDiscounts: boolean): CompositePricing {
  const components = item.composite?.components ?? [];
  const listPrice = components.reduce(
    (sum, component) => sum + calculateItemUnitPrice(component.product, []) * component.quantity,
    0,
  );
  const unitPrice = applyDiscounts ? Math.max(listPrice, item.product.price) : listPrice;
  const discountAmount = applyDiscounts ? (unitPrice - item.product.price) * item.quantity : 0;
  const hasDiscount = discountAmount > 0;

  return {
    segment: {
      lineId: item.lineId,
      quantity: item.quantity,
      unitPrice,
      discountAmount,
      applicationRef: hasDiscount ? ref : null,
    },
    application: hasDiscount
      ? {
          ref,
          promotionId: null,
          kind: APPLIED_PROMOTION_KIND.COMPOSITE,
          name: item.product.name,
          ruleSnapshot: {
            type: APPLIED_PROMOTION_KIND.COMPOSITE,
            productId: item.product.id,
            price: item.product.price,
            listPrice,
            schedule: item.product.availabilitySchedule,
            components: components.map((component) => ({
              productId: component.product.id,
              name: component.product.name,
              quantity: component.quantity,
              unitPrice: calculateItemUnitPrice(component.product, []),
            })),
          },
          discountAmount,
        }
      : null,
  };
}

export interface PriceCartOptions {
  // Delivery platforms set their own prices, so their carts carry no discounts at all.
  applyDiscounts: boolean;
}

export function priceCart(
  items: CartItem[],
  promotions: Promotion[],
  options: PriceCartOptions = { applyDiscounts: true },
): CartPricing {
  const standardItems = items.filter((item) => !item.composite);
  const priced = applyPromotions(
    standardItems.map((item) => ({
      lineId: item.lineId,
      productId: item.product.id,
      categoryId: item.product.categoryId,
      unitPrice: calculateItemUnitPrice(item.product, item.selectedModifiers),
      basePrice: item.product.price,
      unitAddedAt: item.unitAddedAt,
    })),
    options.applyDiscounts ? promotions : [],
  );

  const composites = items
    .filter((item) => item.composite)
    .map((item, index) => priceComposite(item, `composite-${index + 1}`, options.applyDiscounts));
  const segmentsByLineId = new Map<string, PricedSegment[]>();
  for (const segment of [...priced.segments, ...composites.map((composite) => composite.segment)]) {
    segmentsByLineId.set(segment.lineId, [...(segmentsByLineId.get(segment.lineId) ?? []), segment]);
  }

  // Keep segments in cart order so the ticket and the saved sale read like the cart.
  const segments = items.flatMap((item) => segmentsByLineId.get(item.lineId) ?? []);
  const applications = [
    ...priced.applications,
    ...composites.flatMap((composite) => (composite.application ? [composite.application] : [])),
  ];
  const subtotal = segments.reduce((sum, segment) => sum + segment.unitPrice * segment.quantity, 0);
  const discountTotal = applications.reduce((sum, application) => sum + application.discountAmount, 0);

  return {
    segments,
    applications,
    subtotal,
    discountTotal,
    total: subtotal - discountTotal,
    itemsCount: items.reduce((total, item) => total + item.quantity, 0),
  };
}

export function getLinePricing(pricing: CartPricing, lineId: string): CartLinePricing {
  const segments = pricing.segments.filter((segment) => segment.lineId === lineId);
  const grossTotal = segments.reduce((sum, segment) => sum + segment.unitPrice * segment.quantity, 0);
  const discountAmount = segments.reduce((sum, segment) => sum + segment.discountAmount, 0);
  const refs = new Set(segments.map((segment) => segment.applicationRef).filter((ref) => ref !== null));
  const promotionNames = [
    ...new Set(pricing.applications.filter((application) => refs.has(application.ref)).map((application) => application.name)),
  ];

  return { grossTotal, discountAmount, netTotal: grossTotal - discountAmount, promotionNames };
}
