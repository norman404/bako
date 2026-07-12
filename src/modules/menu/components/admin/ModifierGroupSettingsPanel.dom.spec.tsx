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
type UnassignModifierGroupResult = ReturnType<typeof modifierHooks.useUnassignModifierGroup>;
type UseCategoryAssignmentsResult = ReturnType<typeof modifierHooks.useCategoryAssignments>;
type UseProductAssignmentsResult = ReturnType<typeof modifierHooks.useProductAssignments>;
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
  categoryAssignments?: Map<string, Set<string>>;
  productAssignments?: Map<string, Set<string>>;
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

  vi.spyOn(modifierHooks, "useUnassignModifierGroup").mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as unknown as UnassignModifierGroupResult);

  vi.spyOn(modifierHooks, "useCategoryAssignments").mockReturnValue({
    data: opts.categoryAssignments ?? new Map(),
    isLoading: false,
  } as unknown as UseCategoryAssignmentsResult);

  vi.spyOn(modifierHooks, "useProductAssignments").mockReturnValue({
    data: opts.productAssignments ?? new Map(),
    isLoading: false,
  } as unknown as UseProductAssignmentsResult);

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
    it("renders create form with name, type, and required fields", () => {
      mockAllHooks();

      renderPanel();

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/requerido/i)).toBeInTheDocument();
    });

    it("renders an options editor section with add-option control", () => {
      mockAllHooks();

      renderPanel();

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
    it("opens a confirmation dialog when the archive button is clicked", () => {
      mockAllHooks({
        groups: [buildGroup({ id: "g-archive", name: "Nivel de hielo" })],
      });

      renderPanel();

      // Before clicking, no confirmation dialog is visible
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /archivar nivel de hielo/i }));

      // A confirmation dialog MUST appear
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/archivar.*nivel de hielo/i)).toBeInTheDocument();
    });

    it("calls archive mutation only after the confirmation dialog is accepted", () => {
      const archiveMutate = vi.fn().mockResolvedValue(undefined);

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
      vi.spyOn(modifierHooks, "useUnassignModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as UnassignModifierGroupResult);
      vi.spyOn(modifierHooks, "useCategoryAssignments").mockReturnValue({
        data: new Map(),
        isLoading: false,
      } as unknown as UseCategoryAssignmentsResult);
      vi.spyOn(modifierHooks, "useProductAssignments").mockReturnValue({
        data: new Map(),
        isLoading: false,
      } as unknown as UseProductAssignmentsResult);
      vi.spyOn(categoryHooks, "useCategories").mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as UseCategoriesResult);
      vi.spyOn(productHooks, "useProducts").mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as UseProductsResult);

      renderPanel();

      // Click the archive button
      fireEvent.click(screen.getByRole("button", { name: /archivar nivel de hielo/i }));

      // The dialog appears, but the mutation has NOT been called yet
      expect(archiveMutate).not.toHaveBeenCalled();

      // Click "Cancelar" inside the dialog
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /cancelar/i }));

      // The mutation is still NOT called
      expect(archiveMutate).not.toHaveBeenCalled();
    });

    it("calls archive mutation with the group id when the dialog is accepted", () => {
      const archiveMutate = vi.fn().mockResolvedValue(undefined);

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
      vi.spyOn(modifierHooks, "useUnassignModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as UnassignModifierGroupResult);
      vi.spyOn(modifierHooks, "useCategoryAssignments").mockReturnValue({
        data: new Map(),
        isLoading: false,
      } as unknown as UseCategoryAssignmentsResult);
      vi.spyOn(modifierHooks, "useProductAssignments").mockReturnValue({
        data: new Map(),
        isLoading: false,
      } as unknown as UseProductAssignmentsResult);
      vi.spyOn(categoryHooks, "useCategories").mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as UseCategoriesResult);
      vi.spyOn(productHooks, "useProducts").mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as UseProductsResult);

      renderPanel();

      fireEvent.click(screen.getByRole("button", { name: /archivar nivel de hielo/i }));
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /archivar/i }));

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

      // Select the group first to enter edit mode and reveal the assignment section
      fireEvent.click(screen.getByText("Nivel de hielo"));

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
      vi.spyOn(modifierHooks, "useUnassignModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as UnassignModifierGroupResult);
      vi.spyOn(modifierHooks, "useCategoryAssignments").mockReturnValue({
        data: new Map(),
        isLoading: false,
      } as unknown as UseCategoryAssignmentsResult);
      vi.spyOn(modifierHooks, "useProductAssignments").mockReturnValue({
        data: new Map(),
        isLoading: false,
      } as unknown as UseProductAssignmentsResult);
      vi.spyOn(categoryHooks, "useCategories").mockReturnValue({
        data: [buildCategory({ id: "cat-assign", name: "Bebidas" })],
        isLoading: false,
      } as unknown as UseCategoriesResult);
      vi.spyOn(productHooks, "useProducts").mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as UseProductsResult);

      renderPanel();

      fireEvent.click(screen.getByText("Nivel de hielo"));

      const assignSection = screen.getByTestId("modifier-assignment-section");
      const categoryCheckbox = within(assignSection).getByRole("checkbox", { name: /bebidas/i });
      fireEvent.click(categoryCheckbox);

      expect(assignMutate).toHaveBeenCalled();
      const callArg = assignMutate.mock.calls[0][0];
      expect(callArg).toMatchObject({ groupId: "g-assign", categoryId: "cat-assign" });
    });
  });

  // ====================================================================
  // UI refinada: modos crear/editar, asignación con estado visible, validación inline
  // ====================================================================
  describe("refined UI", () => {
    it("starts in 'create' mode with an empty form when there are no groups", () => {
      mockAllHooks({ groups: [] });

      renderPanel();

      // The form heading is "Nuevo grupo" (or "Crear grupo")
      expect(screen.getByRole("heading", { name: /nuevo grupo|crear grupo/i })).toBeInTheDocument();
      // The submit button reads "Crear grupo" (not "Guardar")
      const formRegion = screen.getByTestId("modifier-group-form");
      expect(within(formRegion).getByRole("button", { name: /^crear grupo$/i })).toBeInTheDocument();
    });

    it("switching to edit mode populates the form with the group's data", () => {
      mockAllHooks({
        groups: [
          buildGroup({
            id: "g-edit",
            name: "Nivel de hielo",
            type: "single",
            required: true,
            options: [buildOption({ id: "o1", name: "Sin hielo" })],
          }),
        ],
      });

      renderPanel();

      // Click the group in the list to enter edit mode
      fireEvent.click(screen.getByText("Nivel de hielo"));

      const formRegion = screen.getByTestId("modifier-group-form");
      const nameInput = within(formRegion).getByLabelText(/^nombre$/i);
      expect(nameInput).toHaveValue("Nivel de hielo");
      expect(within(formRegion).getByLabelText(/requerido/i)).toBeChecked();
      // Submit button reads "Guardar"
      expect(within(formRegion).getByRole("button", { name: /guardar/i })).toBeInTheDocument();
    });

    it("'Nuevo' button resets the form to create mode", () => {
      mockAllHooks({
        groups: [buildGroup({ id: "g1", name: "Nivel de hielo" })],
      });

      renderPanel();

      // Edit first
      fireEvent.click(screen.getByText("Nivel de hielo"));
      // Then click "Nuevo"
      fireEvent.click(screen.getByRole("button", { name: /^nuevo$/i }));

      const formRegion = screen.getByTestId("modifier-group-form");
      const nameInput = within(formRegion).getByLabelText(/^nombre$/i);
      expect(nameInput).toHaveValue("");
      expect(within(formRegion).getByRole("button", { name: /^crear grupo$/i })).toBeInTheDocument();
    });

    it("validates that name is non-empty before enabling submit", () => {
      mockAllHooks({ groups: [] });

      renderPanel();

      // Form starts empty
      const submit = screen.getByRole("button", { name: /^crear grupo$/i });
      // The button is disabled because name is empty AND no options
      expect(submit).toBeDisabled();
    });

    it("pre-checks the category checkbox when the group is already assigned to that category", () => {
      mockAllHooks({
        groups: [buildGroup({ id: "g1", name: "Nivel de hielo" })],
        categories: [buildCategory({ id: "cat-1", name: "Bebidas" })],
        products: [],
        categoryAssignments: new Map([["cat-1", new Set(["g1"])]]),
      });

      renderPanel();

      // Select the group to enter edit mode and reveal the assignment section
      fireEvent.click(screen.getByText("Nivel de hielo"));

      const assignSection = screen.getByTestId("modifier-assignment-section");
      const categoryCheckbox = within(assignSection).getByRole("checkbox", { name: /bebidas/i });
      expect(categoryCheckbox).toBeChecked();
    });

    it("pre-checks the product checkbox when the group is already assigned to that product", () => {
      mockAllHooks({
        groups: [buildGroup({ id: "g1", name: "Nivel de hielo" })],
        categories: [],
        products: [buildProduct({ id: "prod-1", name: "Capuchino" })],
        productAssignments: new Map([["prod-1", new Set(["g1"])]]),
      });

      renderPanel();

      fireEvent.click(screen.getByText("Nivel de hielo"));

      const assignSection = screen.getByTestId("modifier-assignment-section");
      const productCheckbox = within(assignSection).getByRole("checkbox", { name: /capuchino/i });
      expect(productCheckbox).toBeChecked();
    });

    it("shows an inline error when the create mutation fails", async () => {
      const createMutate = vi.fn().mockRejectedValue(new Error("Nombre duplicado"));

      vi.spyOn(modifierHooks, "useModifierGroups").mockReturnValue({
        data: [buildGroup({ id: "g1", name: "Existente" })],
        isLoading: false,
      } as unknown as UseModifierGroupsResult);
      vi.spyOn(modifierHooks, "useCreateModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: createMutate,
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
      vi.spyOn(modifierHooks, "useUnassignModifierGroup").mockReturnValue({
        isPending: false,
        mutateAsync: vi.fn(),
      } as unknown as UnassignModifierGroupResult);
      vi.spyOn(modifierHooks, "useCategoryAssignments").mockReturnValue({
        data: new Map(),
        isLoading: false,
      } as unknown as UseCategoryAssignmentsResult);
      vi.spyOn(modifierHooks, "useProductAssignments").mockReturnValue({
        data: new Map(),
        isLoading: false,
      } as unknown as UseProductAssignmentsResult);
      vi.spyOn(categoryHooks, "useCategories").mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as UseCategoriesResult);
      vi.spyOn(productHooks, "useProducts").mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as UseProductsResult);

      renderPanel();

      // Click "Nuevo" to enter create mode
      fireEvent.click(screen.getByRole("button", { name: /^nuevo$/i }));
      // Fill name + option so the form is valid
      fireEvent.input(screen.getByLabelText(/nombre/i), { target: { value: "Toppings" } });
      fireEvent.click(screen.getByRole("button", { name: /agregar opción|añadir opción/i }));
      const optionInputs = screen.getAllByLabelText(/nombre de la opción|opción/i);
      fireEvent.input(optionInputs[0], { target: { value: "Queso" } });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /^crear grupo$/i }));

      // The error is rendered inline
      const formRegion = screen.getByTestId("modifier-group-form");
      await vi.waitFor(() => {
        expect(within(formRegion).getByText(/nombre duplicado/i)).toBeInTheDocument();
      });
    });

    it("hides assignment section when no group is selected (in create mode)", () => {
      mockAllHooks({
        groups: [buildGroup({ id: "g1", name: "Nivel de hielo" })],
        categories: [buildCategory()],
        products: [buildProduct()],
      });

      renderPanel();

      // In create mode (default), the section is hidden because no groupId is selected
      expect(screen.queryByTestId("modifier-assignment-section")).not.toBeInTheDocument();
    });

    it("shows a 'no options yet' hint inside the options editor", () => {
      mockAllHooks({ groups: [] });

      renderPanel();

      expect(screen.getByTestId("options-empty-hint")).toBeInTheDocument();
    });
  });
});
