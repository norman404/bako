import type { Product } from "@/modules/menu/domain/product";

export function calculateItemUnitPrice(
  product: Product,
  modifiers: Array<{ priceDelta: number }>,
): number {
  const surcharge = modifiers.reduce((sum, m) => sum + m.priceDelta, 0);
  return product.price + surcharge;
}