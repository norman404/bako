import { describe, expect, it, mock, spyOn } from "bun:test";
import * as React from "react";



import * as categoryHooks from "@/modules/menu/hooks/use-categories";
import * as menuHooks from "@/modules/menu/hooks/use-menus";
import { CategorySettingsPanel } from "@/modules/menu/components/admin/CategorySettingsPanel";
import { fireEvent, renderWithProviders, screen } from "@/test/test-utils";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

type CreateCategoryResult = ReturnType<typeof categoryHooks.useCreateCategory>;
type UpdateCategoryResult = ReturnType<typeof categoryHooks.useUpdateCategory>;
type ArchiveCategoryResult = ReturnType<typeof categoryHooks.useArchiveCategory>;

const BASE_CATEGORIES = [
  {
    id: "coffee",
    name: "Café",
    description: "Bebidas calientes",
    color: null,
    menuId: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  },
] as const;

function mockCategoryMutations(categories = [...BASE_CATEGORIES], menus: any[] = []) {
  // Mock hooks de lectura
  spyOn(categoryHooks, "useCategories").mockReturnValue({
    data: categories,
    isLoading: false,
  } as any);

  spyOn(menuHooks, "useMenus").mockReturnValue({
    data: menus,
    isLoading: false,
  } as any);

  // Mock hooks de mutación
  spyOn(categoryHooks, "useCreateCategory").mockReturnValue({
    isPending: false,
    mutateAsync: mock(),
  } as unknown as CreateCategoryResult);

  spyOn(categoryHooks, "useUpdateCategory").mockReturnValue({
    isPending: false,
    mutateAsync: mock(),
  } as unknown as UpdateCategoryResult);

  spyOn(categoryHooks, "useArchiveCategory").mockReturnValue({
    isPending: false,
    mutateAsync: mock(),
  } as unknown as ArchiveCategoryResult);
}

function renderCategorySettingsPanel() {
  renderWithProviders(<CategorySettingsPanel />);
}

describe("CategorySettingsPanel", () => {
  it("should render the first category selected with an ultra minimal editor", () => {
    // CASE: categories are already loaded for the menu.
    // VALIDATES: menu admin now owns the category settings panel behavior.
    mockCategoryMutations();

    // Arrange
    renderCategorySettingsPanel();

    // Assert
    expect(screen.getByRole("button", { name: /^nueva$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Café");
  });

  it("should reset the editor when the operator starts a new category", () => {
    // CASE: the operator wants to create a category.
    // VALIDATES: the menu admin panel clears the editor in create mode.
    mockCategoryMutations();

    // Arrange
    renderCategorySettingsPanel();

    // Act
    fireEvent.click(screen.getByRole("button", { name: /^nueva$/i }));

    // Assert
    expect(screen.getByRole("heading", { name: /nueva categoría/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("");
  });
});
