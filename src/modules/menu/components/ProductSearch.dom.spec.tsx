import { describe, expect, it, beforeEach } from "bun:test";

import { renderWithProviders, screen, fireEvent } from "@/test/test-utils";
import { ProductSearch } from "@/modules/menu/components/ProductSearch";
import { useMenuStore } from "@/modules/menu/store/menu-store";

describe("ProductSearch", () => {
  beforeEach(() => {
    // Reset menu store between tests
    useMenuStore.setState({ productSearch: "" });
  });

  it("renders a search input", () => {
    renderWithProviders(<ProductSearch />);

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("reflects the current productSearch value from the store", () => {
    useMenuStore.setState({ productSearch: "Flat white" });

    renderWithProviders(<ProductSearch />);

    expect(screen.getByRole("searchbox")).toHaveValue("Flat white");
  });

  it("updates the store when the user types", () => {
    renderWithProviders(<ProductSearch />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "cappuccino" } });

    expect(useMenuStore.getState().productSearch).toBe("cappuccino");
  });

  it("shows the clear button when there is text", () => {
    useMenuStore.setState({ productSearch: "latte" });

    renderWithProviders(<ProductSearch />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("does not show the clear button when input is empty", () => {
    renderWithProviders(<ProductSearch />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("clears the store when the clear button is clicked", () => {
    useMenuStore.setState({ productSearch: "espresso" });

    renderWithProviders(<ProductSearch />);

    fireEvent.click(screen.getByRole("button"));

    expect(useMenuStore.getState().productSearch).toBe("");
  });
});
