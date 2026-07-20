import { describe, expect, it } from "bun:test";

import { POS_CATEGORY_FILTER, usePosStore } from "@/shared/stores/pos-store";

describe("usePosStore", () => {
  it("should omit legacy dashboard and manager state from the pos ui store", () => {
    // CASE: the POS page only needs active caja ui state after the architectural cleanup.
    // VALIDATES: the store no longer exposes dead dashboard and manager flags/actions.

    // Arrange
    const state = usePosStore.getState() as unknown as Record<string, unknown>;

    // Act
    const dashboardStateExists = "isDashboardOpen" in state;
    const dashboardActionExists = "toggleDashboard" in state;
    const productManagerStateExists = "isProductManagerOpen" in state;
    const categoryManagerStateExists = "isCategoryManagerOpen" in state;
    const productManagerActionExists = "openProductManager" in state;
    const categoryManagerActionExists = "openCategoryManager" in state;

    // Assert
    expect(dashboardStateExists).toBe(false);
    expect(dashboardActionExists).toBe(false);
    expect(productManagerStateExists).toBe(false);
    expect(categoryManagerStateExists).toBe(false);
    expect(productManagerActionExists).toBe(false);
    expect(categoryManagerActionExists).toBe(false);
  });

  it("should omit productSearch state — it now lives in menu-store", () => {
    // CASE: productSearch was moved to the menu module's own store.
    // VALIDATES: pos-store no longer leaks search concerns.

    const state = usePosStore.getState() as unknown as Record<string, unknown>;

    expect("productSearch" in state).toBe(false);
    expect("setProductSearch" in state).toBe(false);
    expect("clearProductSearch" in state).toBe(false);
  });

  it("should keep the active settings, checkout, and mobile cart flows working", () => {
    // CASE: the POS page still depends on the live caja ui actions after cleanup.
    // VALIDATES: the remaining public store API keeps current behavior intact.

    // Arrange
    usePosStore.setState({
      selectedCategory: POS_CATEGORY_FILTER.ALL,
      isCheckoutOpen: false,
      checkoutSessionKey: 0,
      isMobileCartOpen: false,
      isSettingsOpen: false,
    });

    // Act
    usePosStore.getState().setSelectedCategory("coffee");
    usePosStore.getState().openCheckout();
    usePosStore.getState().openMobileCart();
    usePosStore.getState().openSettings();

    // Assert
    const state = usePosStore.getState();
    expect(state.selectedCategory).toBe("coffee");
    expect(state.isCheckoutOpen).toBe(true);
    expect(state.checkoutSessionKey).toBe(1);
    expect(state.isMobileCartOpen).toBe(true);
    expect(state.isSettingsOpen).toBe(true);
  });
});
