import { buildProduct } from "@/modules/menu/test/factories";
import type { CartItem } from "../cart-operations";

export function buildCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    lineId: "line-1",
    product: buildProduct(),
    quantity: 1,
    selectedModifiers: [],
    ...overrides,
  };
}
