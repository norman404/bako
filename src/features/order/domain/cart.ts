import type { Product } from "@/features/menu/domain/product";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartTotals {
  itemsCount: number;
  total: number;
}

export function calculateCartTotals(items: CartItem[]): CartTotals {
  const itemsCount = items.reduce((total, item) => total + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return {
    itemsCount,
    total,
  };
}
