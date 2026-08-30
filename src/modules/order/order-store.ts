import { create } from "zustand";

import type { Product, SelectedModifier } from "@/modules/menu";
import {
  addItemToCart,
  decrementItemQuantity,
  incrementItemQuantity,
  removeItemFromCart,
  type CartItem,
} from "./cart-operations";

interface OrderStore {
  currentOrder: CartItem[];
  orderName: string;
  setOrderName: (orderName: string) => void;
  addItem: (product: Product, modifiers?: SelectedModifier[]) => void;
  incrementItemQuantity: (lineId: string) => void;
  decrementItemQuantity: (lineId: string) => void;
  removeItem: (lineId: string) => void;
  clearOrder: () => void;
}

const useOrderStore = create<OrderStore>((set) => ({
  currentOrder: [],
  orderName: "",

  setOrderName: (orderName) => set({ orderName }),

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

  clearOrder: () => set({ currentOrder: [], orderName: "" }),
}));

export { useOrderStore };