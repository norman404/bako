import { beforeEach, describe, expect, it } from "vitest";

import { useOrderStore } from "./order-store";

describe("order store", () => {
  beforeEach(() => {
    useOrderStore.setState({ currentOrder: [], orderName: "" });
  });

  // CASE: The cashier enters a name while the cart is open.
  // VALIDATES: The draft stores the name so every cart view can read it.
  it("should update the draft order name when the cashier enters a name", () => {
    // Arrange
    const state = useOrderStore.getState();

    // Act
    state.setOrderName("Mesa 4");

    // Assert
    expect(useOrderStore.getState().orderName).toBe("Mesa 4");
  });

  // CASE: The cashier finishes the sale and starts a new cart.
  // VALIDATES: Clearing the cart also clears its optional name.
  it("should clear the draft order name when the cart is cleared", () => {
    // Arrange
    useOrderStore.setState({ currentOrder: [], orderName: "Mesa 4" });

    // Act
    useOrderStore.getState().clearOrder();

    // Assert
    expect(useOrderStore.getState().orderName).toBe("");
  });
});
