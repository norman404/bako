import { parseWeeklySchedule } from "@/lib/weekly-schedule";
import {
  APPLIED_PROMOTION_KIND,
  PROMOTION_TYPE,
  applyPromotions,
  type Promotion,
  type PromotionType,
} from "@/modules/promotions";

import type {
  OrderDetail,
  OrderDetailItem,
  OrderDetailPromotion,
  UpdateOrderItemInput,
  UpdateOrderPromotionInput,
} from "../order-management";

export interface EditedOrderPricing {
  items: UpdateOrderItemInput[];
  promotions: UpdateOrderPromotionInput[];
  total: number;
  discountByItemId: Map<string, number>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Edits are priced with the rules frozen on this sale, never the current configuration: a
// promotion edited or deleted since then must not rewrite what the customer was offered.
function snapshotToPromotion(row: OrderDetailPromotion): Promotion | null {
  if (row.kind !== PROMOTION_TYPE.NXM && row.kind !== PROMOTION_TYPE.BUNDLE) return null;
  if (!isRecord(row.ruleSnapshot)) return null;

  const snapshot = row.ruleSnapshot;
  const schedule = parseWeeklySchedule(snapshot.schedule);
  if (!schedule || !Array.isArray(snapshot.targets)) return null;

  const numberOrNull = (value: unknown) => (typeof value === "number" ? value : null);
  return {
    id: row.promotionId ?? row.id,
    name: row.name,
    type: row.kind as PromotionType,
    buyQuantity: numberOrNull(snapshot.buyQuantity),
    payQuantity: numberOrNull(snapshot.payQuantity),
    bundlePrice: numberOrNull(snapshot.bundlePrice),
    schedule,
    isActive: true,
    targets: snapshot.targets.filter(isRecord).map((target) => ({
      productId: typeof target.productId === "string" ? target.productId : null,
      categoryId: typeof target.categoryId === "string" ? target.categoryId : null,
      quantity: typeof target.quantity === "number" ? target.quantity : 1,
    })),
  };
}

function toModifiersInput(item: OrderDetailItem): UpdateOrderItemInput["modifiers"] {
  return item.modifiers.map((modifier) => ({
    groupId: modifier.groupId ?? "",
    groupName: modifier.groupName,
    optionId: modifier.optionId,
    optionName: modifier.optionName,
    priceDelta: modifier.priceDelta,
    textValue: modifier.textValue,
  }));
}

export function priceEditedOrder(order: OrderDetail, editedItems: OrderDetailItem[]): EditedOrderPricing {
  const originalById = new Map(order.items.map((item) => [item.id, item]));
  const promotionById = new Map(order.promotions.map((promotion) => [promotion.id, promotion]));
  const isComposite = (item: OrderDetailItem) => item.children.length > 0;

  const standardItems = editedItems.filter((item) => !isComposite(item));
  const priced = applyPromotions(
    standardItems.map((item) => ({
      lineId: item.id,
      productId: item.productId,
      categoryId: item.categoryId ?? "",
      unitPrice: item.unitPrice,
      // Every unit was added before the sale was charged, so the sale time decides eligibility.
      unitAddedAt: Array.from({ length: item.quantity }, () => order.createdAt.getTime()),
    })),
    order.promotions.flatMap((row) => {
      const promotion = snapshotToPromotion(row);
      return promotion ? [promotion] : [];
    }),
  );

  const items: UpdateOrderItemInput[] = [];
  const promotions: UpdateOrderPromotionInput[] = priced.applications.map((application) => ({
    ref: application.ref,
    promotionId: application.promotionId,
    kind: application.kind,
    name: application.name,
    ruleSnapshot: application.ruleSnapshot,
    discountAmount: application.discountAmount,
  }));
  const discountByItemId = new Map<string, number>();

  for (const item of editedItems) {
    if (!isComposite(item)) {
      for (const segment of priced.segments.filter((current) => current.lineId === item.id)) {
        items.push({
          productId: item.productId,
          quantity: segment.quantity,
          unitPrice: segment.unitPrice,
          unitCost: item.unitCost,
          discountAmount: segment.discountAmount,
          promotionRef: segment.applicationRef,
          modifiers: toModifiersInput(item),
          children: [],
        });
        discountByItemId.set(item.id, (discountByItemId.get(item.id) ?? 0) + segment.discountAmount);
      }
      continue;
    }

    // A composite was sold inside its schedule: its per-unit saving is kept as recorded.
    const original = originalById.get(item.id) ?? item;
    const perUnitDiscount = original.quantity > 0 ? original.discountAmount / original.quantity : 0;
    const discountAmount = Math.round(perUnitDiscount * item.quantity);
    const sourcePromotion = original.orderPromotionId ? promotionById.get(original.orderPromotionId) : undefined;
    const ref = `composite-${item.id}`;
    const hasDiscount = discountAmount > 0 && sourcePromotion !== undefined;

    if (hasDiscount) {
      promotions.push({
        ref,
        promotionId: sourcePromotion.promotionId,
        kind: APPLIED_PROMOTION_KIND.COMPOSITE,
        name: sourcePromotion.name,
        ruleSnapshot: sourcePromotion.ruleSnapshot,
        discountAmount,
      });
    }
    items.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost,
      discountAmount: hasDiscount ? discountAmount : 0,
      promotionRef: hasDiscount ? ref : null,
      modifiers: toModifiersInput(item),
      children: item.children.map((child) => ({
        productId: child.productId,
        quantity: (child.quantity / original.quantity) * item.quantity,
      })),
    });
    discountByItemId.set(item.id, hasDiscount ? discountAmount : 0);
  }

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount, 0);
  return { items, promotions, total, discountByItemId };
}
