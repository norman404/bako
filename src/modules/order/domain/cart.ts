import { buildCartItemKey } from "@/modules/menu/domain/modifier-group";
import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";
import type { Product } from "@/modules/menu/domain/product";
import { calculateItemUnitPrice } from "@/modules/menu/lib/modifier-price";

export interface CartItem {
  lineId: string;
  product: Product;
  quantity: number;
  selectedModifiers: SelectedModifier[];
}

export interface CartTotals {
  itemsCount: number;
  total: number;
}

export function calculateCartTotals(items: CartItem[]): CartTotals {
  const itemsCount = items.reduce((total, item) => total + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + calculateItemUnitPrice(item.product, item.selectedModifiers) * item.quantity,
    0,
  );

  return {
    itemsCount,
    total,
  };
}

export function addItemToCart(
  items: CartItem[],
  product: Product,
  modifiers: SelectedModifier[],
  lineId: string,
): CartItem[] {
  const newItemKey = buildCartItemKey(product.id, modifiers);
  const existingItem = items.find(
    (item) => buildCartItemKey(item.product.id, item.selectedModifiers) === newItemKey,
  );

  if (existingItem) {
    return items.map((item) =>
      item.lineId === existingItem.lineId ? { ...item, quantity: item.quantity + 1 } : item,
    );
  }

  return [...items, { lineId, product, quantity: 1, selectedModifiers: modifiers }];
}

export function incrementItemQuantity(items: CartItem[], lineId: string): CartItem[] {
  const exists = items.some((item) => item.lineId === lineId);
  if (!exists) return items;

  return items.map((item) =>
    item.lineId === lineId ? { ...item, quantity: item.quantity + 1 } : item,
  );
}

export function decrementItemQuantity(items: CartItem[], lineId: string): CartItem[] {
  const exists = items.some((item) => item.lineId === lineId);
  if (!exists) return items;

  return items
    .map((item) => (item.lineId === lineId ? { ...item, quantity: item.quantity - 1 } : item))
    .filter((item) => item.quantity > 0);
}

export function removeItemFromCart(items: CartItem[], lineId: string): CartItem[] {
  const exists = items.some((item) => item.lineId === lineId);
  if (!exists) return items;

  return items.filter((item) => item.lineId !== lineId);
}