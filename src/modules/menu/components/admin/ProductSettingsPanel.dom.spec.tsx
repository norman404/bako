import { beforeEach, describe, expect, it, vi } from "vitest";

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
import * as categoryHooks from "@/modules/menu/hooks/use-categories";
import * as menuHooks from "@/modules/menu/hooks/use-menus";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { ProductSettingsPanel } from "@/modules/menu/components/admin/ProductSettingsPanel";
import { fireEvent, renderWithProviders, screen, waitFor } from "@/test/test-utils";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

type CreateProductResult = ReturnType<typeof productHooks.useCreateProduct>;
type UpdateProductResult = ReturnType<typeof productHooks.useUpdateProduct>;
type ArchiveProductResult = ReturnType<typeof productHooks.useArchiveProduct>;

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const archiveMutateAsync = vi.fn();

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
];

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
    menuIds: [] as string[],
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  },
];

function mockProductMutations(
  categories = BASE_CATEGORIES,
  products = BASE_PRODUCTS,
  menus: any[] = [],
  flags: Partial<Record<string, boolean>> = {},
) {
  const nextFlags = { ...useFeatureFlagsStore.getState().flags };
  for (const [key, value] of Object.entries(flags)) {
    if (value !== undefined) {
      nextFlags[key] = value;
    }
  }
  useFeatureFlagsStore.setState({ flags: nextFlags });

  // Mock hooks de lectura
  vi.spyOn(categoryHooks, "useCategories").mockReturnValue({
    data: categories,
    isLoading: false,
  } as any);

  vi.spyOn(productHooks, "useProducts").mockReturnValue({
    data: products,
    isLoading: false,
  } as any);

  vi.spyOn(menuHooks, "useMenus").mockReturnValue({
    data: menus,
    isLoading: false,
  } as any);

  // Mock hooks de mutación
  vi.spyOn(productHooks, "useCreateProduct").mockReturnValue({
    isPending: false,
    mutateAsync: createMutateAsync,
  } as unknown as CreateProductResult);

  vi.spyOn(productHooks, "useUpdateProduct").mockReturnValue({
    isPending: false,
    mutateAsync: updateMutateAsync,
  } as unknown as UpdateProductResult);

  vi.spyOn(productHooks, "useArchiveProduct").mockReturnValue({
    isPending: false,
    mutateAsync: archiveMutateAsync,
  } as unknown as ArchiveProductResult);
}

function renderProductSettingsPanel() {
  renderWithProviders(<ProductSettingsPanel />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

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

  it("should update the product name field when the operator types", () => {
    // CASE: the operator edits the selected product name.
    // VALIDATES: typing into a controlled input updates form state without
    // reading event.currentTarget inside the setState updater (which can be
    // null when React batches the update).
    mockProductMutations();

    // Arrange
    renderProductSettingsPanel();
    const nameInput = screen.getByLabelText(/nombre/i);

    // Act
    fireEvent.input(nameInput, { target: { value: "Cortado" } });

    // Assert
    expect(nameInput).toHaveValue("Cortado");
  });

  it("should update the product description field when the operator types", () => {
    mockProductMutations();

    renderProductSettingsPanel();
    const descriptionInput = screen.getByLabelText(/descripción/i);

    fireEvent.input(descriptionInput, { target: { value: "Café con poca leche" } });

    expect(descriptionInput).toHaveValue("Café con poca leche");
  });

  it("should update the product price field when the operator types", () => {
    mockProductMutations();

    renderProductSettingsPanel();
    const priceInput = screen.getByLabelText(/precio/i);

    fireEvent.input(priceInput, { target: { value: "120.50" } });

    expect(priceInput).toHaveValue("120.50");
  });

  it("should update the product prep time field when the operator types", () => {
    mockProductMutations();

    renderProductSettingsPanel();
    const prepTimeInput = screen.getByLabelText(/prep \(min\)/i);

    fireEvent.input(prepTimeInput, { target: { value: "7" } });

    expect(prepTimeInput).toHaveValue("7");
  });

  it("should update the product image field when the operator types", () => {
    mockProductMutations();

    renderProductSettingsPanel();
    const imageInput = screen.getByLabelText(/emoji \/ imagen/i);

    fireEvent.input(imageInput, { target: { value: "🥐" } });

    expect(imageInput).toHaveValue("🥐");
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

  it("allows creating a product when multiple menus are disabled", async () => {
    // CASE: the multiple_menus_enabled flag is off so the menu checkboxes are hidden.
    // VALIDATES: the form does not reject the product because menuIds is empty.
    mockProductMutations(BASE_CATEGORIES, [], [], { multiple_menus_enabled: false });

    renderProductSettingsPanel();
    fireEvent.click(screen.getByRole("button", { name: /^nuevo$/i }));

    fireEvent.input(screen.getByLabelText(/nombre/i), { target: { value: "Cortado" } });
    fireEvent.input(screen.getByLabelText(/precio/i), { target: { value: "120" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar producto/i }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it("allows creating a product when categories selector is hidden but a default exists", async () => {
    // CASE: the categories_enabled flag is off so the category Select is hidden.
    // VALIDATES: the form still uses the first category as default and saves.
    mockProductMutations(BASE_CATEGORIES, [], [], { categories_enabled: false });

    renderProductSettingsPanel();
    fireEvent.click(screen.getByRole("button", { name: /^nuevo$/i }));

    fireEvent.input(screen.getByLabelText(/nombre/i), { target: { value: "Cortado" } });
    fireEvent.input(screen.getByLabelText(/precio/i), { target: { value: "120" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar producto/i }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it("allows saving a product with empty description, image and prep time", async () => {
    // CASE: optional fields are left blank.
    // VALIDATES: description, image and prep time are not required.
    mockProductMutations(BASE_CATEGORIES, [], [], {
      categories_enabled: false,
      multiple_menus_enabled: false,
    });

    renderProductSettingsPanel();
    fireEvent.click(screen.getByRole("button", { name: /^nuevo$/i }));

    fireEvent.input(screen.getByLabelText(/nombre/i), { target: { value: "Cortado" } });
    fireEvent.input(screen.getByLabelText(/precio/i), { target: { value: "120" } });
    fireEvent.input(screen.getByLabelText(/descripción/i), { target: { value: "" } });
    fireEvent.input(screen.getByLabelText(/prep \(min\)/i), { target: { value: "" } });
    fireEvent.input(screen.getByLabelText(/emoji \/ imagen/i), { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar producto/i }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a clear error and highlights the name field when name is empty", () => {
    // CASE: the operator tries to save without a product name.
    // VALIDATES: the error message names the field and the input gets a danger border.
    mockProductMutations();

    renderProductSettingsPanel();
    fireEvent.click(screen.getByRole("button", { name: /^nuevo$/i }));

    fireEvent.input(screen.getByLabelText(/nombre/i), { target: { value: "" } });
    fireEvent.input(screen.getByLabelText(/precio/i), { target: { value: "120" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar producto/i }));

    expect(screen.getByText(/ingresá el nombre del producto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveClass("border-danger");
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("shows a clear error when price is invalid", () => {
    // CASE: the operator types a non-numeric price.
    // VALIDATES: the error message names the price field and does not call create.
    mockProductMutations();

    renderProductSettingsPanel();
    fireEvent.click(screen.getByRole("button", { name: /^nuevo$/i }));

    fireEvent.input(screen.getByLabelText(/nombre/i), { target: { value: "Cortado" } });
    fireEvent.input(screen.getByLabelText(/precio/i), { target: { value: "abc" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar producto/i }));

    expect(screen.getByText(/ingresá un precio válido/i)).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});
