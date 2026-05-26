import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", async () => {
  const React = await import("react");
  const createIcon = (name: string) => {
    return React.forwardRef(function Icon(props: any, ref: any) {
      return React.createElement("svg", { ref, "aria-hidden": "true", "data-icon": name, ...props });
    });
  };

  return new Proxy({}, {
    get(target: any, prop: string | symbol) {
      if (prop === 'default' || prop === '__esModule' || typeof prop !== 'string') {
        return target[prop];
      }
      if (!target[prop]) {
        target[prop] = createIcon(prop);
      }
      return target[prop];
    }
  });
});

import * as categoryHooks from "@/modules/menu/hooks/use-categories";
import { CategorySettingsPanel } from "@/modules/menu/components/admin/CategorySettingsPanel";
import { fireEvent, renderWithProviders, screen } from "@/test/test-utils";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

type CreateCategoryResult = ReturnType<typeof categoryHooks.useCreateCategory>;
type UpdateCategoryResult = ReturnType<typeof categoryHooks.useUpdateCategory>;
type ArchiveCategoryResult = ReturnType<typeof categoryHooks.useArchiveCategory>;

type CategorySettingsPanelProps = Parameters<typeof CategorySettingsPanel>[0];

const BASE_CATEGORIES = [
  {
    id: "coffee",
    name: "Café",
    description: "Bebidas calientes",
    color: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  },
] as const;

function mockCategoryMutations() {
  vi.spyOn(categoryHooks, "useCreateCategory").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as CreateCategoryResult);

  vi.spyOn(categoryHooks, "useUpdateCategory").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as UpdateCategoryResult);

  vi.spyOn(categoryHooks, "useArchiveCategory").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as ArchiveCategoryResult);
}

function renderCategorySettingsPanel(overrides: Partial<CategorySettingsPanelProps> = {}) {
  renderWithProviders(
    <CategorySettingsPanel categories={overrides.categories ?? [...BASE_CATEGORIES]} />,
  );
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
