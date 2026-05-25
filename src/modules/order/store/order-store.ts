import { create } from "zustand";

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
  addItem: (product: Product) => void;
  incrementItemQuantity: (productId: string) => void;
  decrementItemQuantity: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearOrder: () => void;
}

const useOrderStore = create<OrderStore>((set) => ({
  currentOrder: [],

  addItem: (product) =>
    set((state) => ({
      currentOrder: addItemToCart(state.currentOrder, product),
    })),

  incrementItemQuantity: (productId) =>
    set((state) => ({
      currentOrder: incrementItemQuantity(state.currentOrder, productId),
    })),

  decrementItemQuantity: (productId) =>
    set((state) => ({
      currentOrder: decrementItemQuantity(state.currentOrder, productId),
    })),

  removeItem: (productId) =>
    set((state) => ({
      currentOrder: removeItemFromCart(state.currentOrder, productId),
    })),

  clearOrder: () => set({ currentOrder: [] }),
}));

export { useOrderStore };
