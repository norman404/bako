import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { okAsync } from "neverthrow";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { renderWithProviders, screen } from "@/test/test-utils";

vi.mock("@/modules/feature-flags/persistence/feature-flag-drizzle.repository", () => ({
  featureFlagDrizzleRepository: {
    update: vi.fn(),
  },
}));

import { featureFlagDrizzleRepository } from "@/modules/feature-flags/persistence/feature-flag-drizzle.repository";

describe("FeatureFlagsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeatureFlagsStore.setState({
      flags: { categories_enabled: false, multiple_menus_enabled: false },
      isLoading: false,
    });
  });

  it("should render the panel title and description", () => {
    renderWithProviders(<FeatureFlagsPanel />);

    expect(screen.getByRole("heading", { name: /módulos y funcionalidades/i })).toBeInTheDocument();
    expect(screen.getByText(/activa o desactiva funcionalidades de cada módulo/i)).toBeInTheDocument();
  });

  it("should render module sections with their flags", () => {
    renderWithProviders(<FeatureFlagsPanel />);

    expect(screen.getByRole("heading", { name: "Menú" })).toBeInTheDocument();
    expect(screen.getByText(/cómo se organizan y muestran los productos/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /categorías/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /múltiples menús/i })).toBeInTheDocument();
  });

  it("should show current flag states", () => {
    useFeatureFlagsStore.setState({
      flags: { categories_enabled: true, multiple_menus_enabled: false },
      isLoading: false,
    });

    renderWithProviders(<FeatureFlagsPanel />);

    const categoriesToggle = screen.getByRole("checkbox", { name: /categorías/i });
    const menusToggle = screen.getByRole("checkbox", { name: /múltiples menús/i });

    expect(categoriesToggle).toBeChecked();
    expect(menusToggle).not.toBeChecked();
  });

  it("should call mutation when toggle is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(featureFlagDrizzleRepository.update).mockReturnValue(okAsync(undefined));

    renderWithProviders(<FeatureFlagsPanel />);

    const categoriesToggle = screen.getByRole("checkbox", { name: /categorías/i });

    await user.click(categoriesToggle);

    expect(featureFlagDrizzleRepository.update).toHaveBeenCalledWith("categories_enabled", true);
  });

  it("should update UI optimistically on toggle", async () => {
    const user = userEvent.setup();
    vi.mocked(featureFlagDrizzleRepository.update).mockReturnValue(okAsync(undefined));

    renderWithProviders(<FeatureFlagsPanel />);

    const categoriesToggle = screen.getByRole("checkbox", { name: /categorías/i });
    expect(categoriesToggle).not.toBeChecked();

    await user.click(categoriesToggle);

    // Should be checked immediately (optimistic)
    expect(useFeatureFlagsStore.getState().flags.categories_enabled).toBe(true);
  });
});
