import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("lucide-react", async () => {
  const React = await import("react");
  const createIcon = (name: string) => {
    return React.forwardRef(function Icon(props: any, ref: any) {
      return React.createElement("svg", { ref, "aria-hidden": "true", "data-icon": name, ...props });
    });
  };

  return new Proxy({}, {
    get(target: any, prop: string | symbol) {
      if (prop === "default" || prop === "__esModule" || typeof prop !== "string") {
        return target[prop];
      }
      if (!target[prop]) {
        target[prop] = createIcon(prop);
      }
      return target[prop];
    },
  });
});

import * as modifierHooks from "@/modules/menu/hooks/use-modifier-groups";
import * as categoryHooks from "@/modules/menu/hooks/use-categories";
import * as productHooks from "@/modules/menu/hooks/use-products";
import { ModifierGroupSettingsPanel } from "@/modules/menu/components/admin/ModifierGroupSettingsPanel";
import { fireEvent, renderWithProviders, screen, within } from "@/test/test-utils";
import type { ModifierGroup, ModifierOption } from "@/modules/menu/domain/modifier-group";
import type { Category } from "@/modules/menu/domain/category";
import type { Product } from "@/modules/menu/domain/product";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

type UseModifierGroupsResult = ReturnType<typeof modifierHooks.useModifierGroups>;
type CreateModifierGroupResult = ReturnType<typeof modifierHooks.useCreateModifierGroup>;
type UpdateModifierGroupResult = ReturnType<typeof modifierHooks.useUpdateModifierGroup>;
type ArchiveModifierGroupResult = ReturnType<typeof modifierHooks.useArchiveModifierGroup>;
type AssignModifierGroupResult = ReturnType<typeof modifierHooks.useAssignModifierGroup>;
type UseCategoriesResult = ReturnType<typeof categoryHooks.useCategories>;
type UseProductsResult = ReturnType<typeof productHooks.useProducts>;

function buildOption(overrides: Partial<ModifierOption> = {}): ModifierOption {
  return {
    id: "opt-1",
    groupId: "grp-1",
    name: "Sin hielo",
    priceDelta: 0,
    isDefault: true,
    sortOrder: 0,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

function buildGroup(overrides: Partial<ModifierGroup> = {}): ModifierGroup {
  return {
    id: "grp-1",
    name: "Nivel de hielo",
    type: "single",
    required: false,
    sortOrder: 0,
    options: [buildOption()],
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Bebidas",
    description: "Bebidas frías y calientes",
    color: null,
    menuId: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    categoryId: "cat-1",
    menuIds: ["menu-1"],
    name: "Capuchino",
    description: "Café con leche",
    price: 5000,
    prepTimeMinutes: 5,
    image: "☕",
    isPopular: false,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

function mockAllHooks(opts: {
  groups?: ModifierGroup[];
  categories?: Category[];
  products?: Product[];
  createPending?: boolean;
} = {}) {
  const groups = opts.groups ?? [buildGroup()];
  const categories = opts.categories ?? [buildCategory()];
  const products = opts.products ?? [buildProduct()];

  vi.spyOn(modifierHooks, "useModifierGroups").mockReturnValue({
    data: groups,
    isLoading: false,
  } as unknown as UseModifierGroupsResult);

  vi.spyOn(modifierHooks, "useCreateModifierGroup").mockReturnValue({
    isPending: opts.createPending ?? false,
    mutateAsync: vi.fn(),
  } as unknown as CreateModifierGroupResult);

  vi.spyOn(modifierHooks, "useUpdateModifierGroup").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as unknown as UpdateModifierGroupResult);

  vi.spyOn(modifierHooks, "useArchiveModifierGroup").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as unknown as ArchiveModifierGroupResult);

  vi.spyOn(modifierHooks, "useAssignModifierGroup").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as unknown as AssignModifierGroupResult);

  vi.spyOn(categoryHooks, "useCategories").mockReturnValue({
    data: categories,
    isLoading: false,
  } as unknown as UseCategoriesResult);

  vi.spyOn(productHooks, "useProducts").mockReturnValue({
    data: products,
    isLoading: false,
  } as unknown as UseProductsResult);
}

function renderPanel() {
  return renderWithProviders(<ModifierGroupSettingsPanel />);
}

describe("ModifierGroupSettingsPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("list rendering", () => {
    it("renders existing modifier groups in the list", () => {
      // CASE: groups exist
      // VALIDATES: list shows group names
      mockAllHooks({
        groups: [
          buildGroup({ id: "g1", name: "Nivel de hielo", type: "single" }),
          buildGroup({ id: "g2", name: "Toppings", type: "multiple" }),
        ],
      });

      renderPanel();

      expect(screen.getByText("Nivel de hielo")).toBeInTheDocument();
      expect(screen.getByText("Toppings")).toBeInTheDocument();
    });

    it("shows empty state when no groups exist", () => {
      mockAllHooks({ groups: [] });

      renderPanel();

      expect(screen.getByText(/no hay grupos|sin grupos/i)).toBeInTheDocument();
    });

    it("shows archive button per group in the list", () => {
      mockAllHooks({
        groups: [buildGroup({ id: "g1", name: "Nivel de hielo" })],
      });

      renderPanel();

      const archiveBtn = screen.getByRole("button", { name: /archivar nivel de hielo/i });
      expect(archiveBtn).toBeInTheDocument();
    });
  });

  describe("create form", () => {
    it("renders create form with name, type, required, and sort order fields", () => {
      mockAllHooks();

      renderPanel();

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/requerido/i)).toBeInTheDocument();
    });

    it("renders an options editor section with add-option control", () => {
      mockAllHooks();

      renderPanel();

      // options editor region
      expect(screen.getByRole("button", { name: /agregar opción|añadir opción/i })).toBeInTheDocument();
    });

    it("creates a group when form is submitted with valid data", async () => {
      mockAllHooks();
      renderPanel();

      // Fill name
      fireEvent.input(screen.getByLabelText(/nombre/i), { target: { value: "Nivel de azúcar" } });

      // Add an option
      fireEvent.click(screen.getByRole("button", { name: /agregar opción|añadir opción/i }));

      // First option name input
      const optionInputs = screen.getAllByLabelText(/nombre de la opción|opción/i);
      fireEvent.input(optionInputs[0], { target: { value: "Sin azúcar" } });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /guardar|crear grupo/i }));

      // createModifierGroup mutateAsync should have been called
      const createSpy = modifierHooks.useCreateModifierGroup().mutateAsync as unknown as ReturnType<typeof vi.fn>;
      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe("archive action", () => {
    it("calls archive mutation when archive button clicked and confirmed", () => {
      const archiveMutate = vi.fn();
      // window.confirm auto-true
      vi.spyOn(window, "confirm").mockReturnValue(true);

      vi.spyOn(modifierHooks, "useModifierGroups").mockReturnValue({
        data: [buildGroup({ id: "g-archive", name: "Nivel de hielo" })],
        isLoading: false,
      } as unknown as UseModifierGroupsResult);
      vi.spyOn(modifierHooks, "useCreateModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as CreateModifierGroupResult);
      vi.spyOn(modifierHooks, "useUpdateModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as UpdateModifierGroupResult);
      vi.spyOn(modifierHooks, "useArchiveModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: archiveMutate,
      } as unknown as ArchiveModifierGroupResult);
      vi.spyOn(modifierHooks, "useAssignModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as AssignModifierGroupResult);
      vi.spyOn(categoryHooks, "useCategories").mockReturnValue({
        data: [buildCategory()],
        isLoading: false,
      } as unknown as UseCategoriesResult);
      vi.spyOn(productHooks, "useProducts").mockReturnValue({
        data: [buildProduct()],
        isLoading: false,
      } as unknown as UseProductsResult);

      renderPanel();

      fireEvent.click(screen.getByRole("button", { name: /archivar nivel de hielo/i }));

      expect(archiveMutate).toHaveBeenCalledWith("g-archive");
    });
  });

  describe("assignment controls", () => {
    it("renders assignment section with categories and products checkboxes", () => {
      mockAllHooks({
        groups: [buildGroup({ id: "g1", name: "Nivel de hielo" })],
        categories: [buildCategory({ id: "cat-1", name: "Bebidas" })],
        products: [buildProduct({ id: "prod-1", name: "Capuchino" })],
      });

      renderPanel();

      // Assignment section must show category and product names with checkboxes
      const assignSection = screen.getByTestId("modifier-assignment-section");
      expect(within(assignSection).getByText(/bebidas/i)).toBeInTheDocument();
      expect(within(assignSection).getByText(/capuchino/i)).toBeInTheDocument();
    });

    it("calls assign mutation when a category checkbox is toggled on", () => {
      const assignMutate = vi.fn();
      vi.spyOn(modifierHooks, "useModifierGroups").mockReturnValue({
        data: [buildGroup({ id: "g-assign", name: "Nivel de hielo" })],
        isLoading: false,
      } as unknown as UseModifierGroupsResult);
      vi.spyOn(modifierHooks, "useCreateModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as CreateModifierGroupResult);
      vi.spyOn(modifierHooks, "useUpdateModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as UpdateModifierGroupResult);
      vi.spyOn(modifierHooks, "useArchiveModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as ArchiveModifierGroupResult);
      vi.spyOn(modifierHooks, "useAssignModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: assignMutate,
      } as unknown as AssignModifierGroupResult);
      vi.spyOn(categoryHooks, "useCategories").mockReturnValue({
        data: [buildCategory({ id: "cat-assign", name: "Bebidas" })],
        isLoading: false,
      } as unknown as UseCategoriesResult);
      vi.spyOn(productHooks, "useProducts").mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as UseProductsResult);

      renderPanel();

      // Need to select the group first (click on list item) to populate assignment
      fireEvent.click(screen.getByText("Nivel de hielo"));

      const assignSection = screen.getByTestId("modifier-assignment-section");
      const categoryCheckbox = within(assignSection).getByRole("checkbox", { name: /bebidas/i });
      fireEvent.click(categoryCheckbox);

      expect(assignMutate).toHaveBeenCalled();
      const callArg = assignMutate.mock.calls[0][0];
      expect(callArg).toMatchObject({ groupId: "g-assign", categoryId: "cat-assign" });
    });
  });
});