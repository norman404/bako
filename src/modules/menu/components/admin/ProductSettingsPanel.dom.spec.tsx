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

import * as productHooks from "@/modules/menu/hooks/use-products";
import { ProductSettingsPanel } from "@/modules/menu/components/admin/ProductSettingsPanel";
import { fireEvent, renderWithProviders, screen } from "@/test/test-utils";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

type CreateProductResult = ReturnType<typeof productHooks.useCreateProduct>;
type UpdateProductResult = ReturnType<typeof productHooks.useUpdateProduct>;
type ArchiveProductResult = ReturnType<typeof productHooks.useArchiveProduct>;

type ProductSettingsPanelProps = Parameters<typeof ProductSettingsPanel>[0];

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

const BASE_PRODUCTS = [
  {
    id: "flat-white",
    categoryId: "coffee",
    name: "Flat white",
    description: "Doble shot con leche vaporizada",
    price: 6500,
    prepTimeMinutes: 4,
    image: "☕",
    isPopular: true,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  },
] as const;

function mockProductMutations() {
  vi.spyOn(productHooks, "useCreateProduct").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as CreateProductResult);

  vi.spyOn(productHooks, "useUpdateProduct").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as UpdateProductResult);

  vi.spyOn(productHooks, "useArchiveProduct").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as ArchiveProductResult);
}

function renderProductSettingsPanel(overrides: Partial<ProductSettingsPanelProps> = {}) {
  renderWithProviders(
    <ProductSettingsPanel
      categories={overrides.categories ?? [...BASE_CATEGORIES]}
      products={overrides.products ?? [...BASE_PRODUCTS]}
      onManageCategories={overrides.onManageCategories ?? vi.fn()}
    />,
  );
}

describe("ProductSettingsPanel", () => {
  it("should render the first product selected with an ultra minimal editor", () => {
    // CASE: products and categories are already loaded for the menu.
    // VALIDATES: menu admin now owns the product settings panel behavior.
    mockProductMutations();

    // Arrange
    renderProductSettingsPanel();

    // Assert
    expect(screen.getByLabelText(/buscar producto/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^nuevo$/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Flat white")).toBeInTheDocument();
  });

  it("should reset the editor when the operator starts a new product", () => {
    // CASE: the operator wants to create a new product.
    // VALIDATES: the menu admin panel clears the editor in create mode.
    mockProductMutations();

    // Arrange
    renderProductSettingsPanel();

    // Act
    fireEvent.click(screen.getByRole("button", { name: /^nuevo$/i }));

    // Assert
    expect(screen.getByRole("heading", { name: /nuevo producto/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("");
  });
});
