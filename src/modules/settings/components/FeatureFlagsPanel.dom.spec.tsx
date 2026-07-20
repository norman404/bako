import { describe, it, expect, mock, beforeEach, type Mock } from "bun:test";

import userEvent from "@testing-library/user-event";
import { okAsync } from "neverthrow";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { renderWithProviders, screen } from "@/test/test-utils";

mock.module("@/modules/feature-flags/persistence/feature-flag-drizzle.repository", () => ({
  featureFlagDrizzleRepository: {
    update: mock(),
  },
}));

import { featureFlagDrizzleRepository } from "@/modules/feature-flags/persistence/feature-flag-drizzle.repository";

describe("FeatureFlagsPanel", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    useFeatureFlagsStore.setState({
      flags: { categories_enabled: false, multiple_menus_enabled: false, modifier_groups_enabled: false },
      isLoading: false,
    });
  });

  it("should render module sections with their flags", () => {
    renderWithProviders(<FeatureFlagsPanel />);

    // Module section titles
    expect(screen.getByText("Menú")).toBeInTheDocument();
    expect(screen.getByText(/cómo se organizan y muestran los productos/i)).toBeInTheDocument();

    // Flag rows with switches
    expect(screen.getByRole("switch", { name: /categorías/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /múltiples menús/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /opciones de producto/i })).toBeInTheDocument();
  });

  it("should show current flag states", () => {
    useFeatureFlagsStore.setState({
      flags: { categories_enabled: true, multiple_menus_enabled: false, modifier_groups_enabled: true },
      isLoading: false,
    });

    renderWithProviders(<FeatureFlagsPanel />);

    const categoriesToggle = screen.getByRole("switch", { name: /categorías/i });
    const menusToggle = screen.getByRole("switch", { name: /múltiples menús/i });

    expect(categoriesToggle).toBeChecked();
    expect(menusToggle).not.toBeChecked();
  });

  it("should call mutation when toggle is clicked", async () => {
    const user = userEvent.setup();
    (featureFlagDrizzleRepository.update as Mock<typeof featureFlagDrizzleRepository.update>).mockReturnValue(okAsync(undefined));

    renderWithProviders(<FeatureFlagsPanel />);

    const categoriesToggle = screen.getByRole("switch", { name: /categorías/i });

    await user.click(categoriesToggle);

    expect(featureFlagDrizzleRepository.update).toHaveBeenCalledWith("categories_enabled", true);
  });

  it("should update UI optimistically on toggle", async () => {
    const user = userEvent.setup();
    (featureFlagDrizzleRepository.update as Mock<typeof featureFlagDrizzleRepository.update>).mockReturnValue(okAsync(undefined));

    renderWithProviders(<FeatureFlagsPanel />);

    const categoriesToggle = screen.getByRole("switch", { name: /categorías/i });
    expect(categoriesToggle).not.toBeChecked();

    await user.click(categoriesToggle);

    // Should be checked immediately (optimistic)
    expect(useFeatureFlagsStore.getState().flags.categories_enabled).toBe(true);
  });
});
