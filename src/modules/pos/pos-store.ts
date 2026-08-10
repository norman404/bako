import { create } from "zustand";

const POS_CATEGORY_FILTER = {
  ALL: "all",
} as const;

interface PosUiState {
  selectedCategory: string;
  isCheckoutOpen: boolean;
  checkoutSessionKey: number;
  isMobileCartOpen: boolean;
  isSettingsOpen: boolean;
}

interface PosUiActions {
  setSelectedCategory: (categoryId: string) => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  openMobileCart: () => void;
  closeMobileCart: () => void;
  toggleMobileCart: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

type PosStore = PosUiState & PosUiActions;

const initialPosUiState: PosUiState = {
  selectedCategory: POS_CATEGORY_FILTER.ALL,
  isCheckoutOpen: false,
  checkoutSessionKey: 0,
  isMobileCartOpen: false,
  isSettingsOpen: false,
};

const usePosStore = create<PosStore>((set) => ({
  ...initialPosUiState,

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  openCheckout: () =>
    set((state) => ({
      isCheckoutOpen: true,
      checkoutSessionKey: state.checkoutSessionKey + 1,
    })),

  closeCheckout: () => set({ isCheckoutOpen: false }),

  openMobileCart: () => set({ isMobileCartOpen: true }),
  closeMobileCart: () => set({ isMobileCartOpen: false }),
  toggleMobileCart: () => set((state) => ({ isMobileCartOpen: !state.isMobileCartOpen })),

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
}));

export { POS_CATEGORY_FILTER, usePosStore };
