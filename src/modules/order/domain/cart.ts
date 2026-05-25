import type { Product } from "@/modules/menu/domain/product";

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

export function addItemToCart(items: CartItem[], product: Product): CartItem[] {
  const existingItem = items.find((item) => item.product.id === product.id);
  if (!existingItem) {
    return [...items, { product, quantity: 1 }];
  }
  return items.map((item) =>
    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
  );
}

export function incrementItemQuantity(items: CartItem[], productId: string): CartItem[] {
  return items.map((item) =>
    item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
  );
}

export function decrementItemQuantity(items: CartItem[], productId: string): CartItem[] {
  return items
    .map((item) =>
      item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
    )
    .filter((item) => item.quantity > 0);
}

export function removeItemFromCart(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.product.id !== productId);
}
