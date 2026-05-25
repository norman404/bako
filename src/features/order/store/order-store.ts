import { create } from "zustand";

import type { Product } from "@/features/menu/domain/product";
import type { CartItem } from "@/features/order/domain/cart";

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
    set((state) => {
      const existingItem = state.currentOrder.find((item) => item.product.id === product.id);
      if (!existingItem) {
        return {
          currentOrder: [...state.currentOrder, { product, quantity: 1 }],
        };
      }

      return {
        currentOrder: state.currentOrder.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      };
    }),

  incrementItemQuantity: (productId) =>
    set((state) => ({
      currentOrder: state.currentOrder.map((item) =>
        item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    })),

  decrementItemQuantity: (productId) =>
    set((state) => ({
      currentOrder: state.currentOrder
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    })),

  removeItem: (productId) =>
    set((state) => ({
      currentOrder: state.currentOrder.filter((item) => item.product.id !== productId),
    })),

  clearOrder: () => set({ currentOrder: [] }),
}));

export { useOrderStore };
