import { create } from "zustand";

import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";
import type { Product } from "@/modules/menu/domain/product";
import {
  addItemToCart,
  decrementItemQuantity,
  incrementItemQuantity,
  removeItemFromCart,
  type CartItem,
} from "@/modules/order/domain/cart";

interface OrderStore {
  currentOrder: CartItem[];
  addItem: (product: Product, modifiers?: SelectedModifier[]) => void;
  incrementItemQuantity: (lineId: string) => void;
  decrementItemQuantity: (lineId: string) => void;
  removeItem: (lineId: string) => void;
  clearOrder: () => void;
}

const useOrderStore = create<OrderStore>((set) => ({
  currentOrder: [],

  addItem: (product, modifiers = []) =>
    set((state) => ({
      currentOrder: addItemToCart(state.currentOrder, product, modifiers, crypto.randomUUID()),
    })),

  incrementItemQuantity: (lineId) =>
    set((state) => ({
      currentOrder: incrementItemQuantity(state.currentOrder, lineId),
    })),

  decrementItemQuantity: (lineId) =>
    set((state) => ({
      currentOrder: decrementItemQuantity(state.currentOrder, lineId),
    })),

  removeItem: (lineId) =>
    set((state) => ({
      currentOrder: removeItemFromCart(state.currentOrder, lineId),
    })),

  clearOrder: () => set({ currentOrder: [] }),
}));

export { useOrderStore };