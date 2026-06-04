import { create } from "zustand";

interface MenuSearchState {
  productSearch: string;
}

interface MenuSearchActions {
  setProductSearch: (query: string) => void;
  clearProductSearch: () => void;
}

type MenuStore = MenuSearchState & MenuSearchActions;

const initialMenuState: MenuSearchState = {
  productSearch: "",
};

const useMenuStore = create<MenuStore>((set) => ({
  ...initialMenuState,

  setProductSearch: (productSearch) => set({ productSearch }),

  clearProductSearch: () => set({ productSearch: "" }),
}));

export { useMenuStore };
