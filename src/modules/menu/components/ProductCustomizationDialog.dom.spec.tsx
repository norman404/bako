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

import { fireEvent, renderWithProviders, screen, within } from "@/test/test-utils";
import {
  ProductCustomizationDialog,
  type ProductCustomizationDialogProps,
} from "@/modules/menu/components/ProductCustomizationDialog";
import type { ModifierGroup, ModifierOption, SelectedModifier } from "@/modules/menu/domain/modifier-group";
import type { Product } from "@/modules/menu/domain/product";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

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

function renderDialog(props: Partial<ProductCustomizationDialogProps> = {}) {
  const defaultProps: ProductCustomizationDialogProps = {
    product: buildProduct(),
    groups: [],
    open: true,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  };
  const merged = { ...defaultProps, ...props };
  return renderWithProviders(<ProductCustomizationDialog {...merged} />);
}

describe("ProductCustomizationDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering by group type", () => {
    it("renders single group options as radio buttons with default pre-selected", () => {
      // GIVEN a `single` group "Nivel de hielo" with options "Sin hielo" (default), "Poco", "Normal", "Extra"
      // WHEN the dialog opens
      // THEN "Sin hielo" is pre-selected; radio buttons rendered
      const group = buildGroup({
        id: "grp-single",
        name: "Nivel de hielo",
        type: "single",
        options: [
          buildOption({ id: "opt-sin", name: "Sin hielo", isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-poco", name: "Poco", isDefault: false, sortOrder: 1 }),
          buildOption({ id: "opt-normal", name: "Normal", isDefault: false, sortOrder: 2 }),
          buildOption({ id: "opt-extra", name: "Extra", isDefault: false, sortOrder: 3 }),
        ],
      });

      renderDialog({ groups: [group] });

      const radioGroup = screen.getByRole("radiogroup", { name: /nivel de hielo/i });
      expect(radioGroup).toBeInTheDocument();

      const radios = within(radioGroup).getAllByRole("radio");
      expect(radios).toHaveLength(4);

      // "Sin hielo" pre-selected
      expect(within(radioGroup).getByLabelText(/sin hielo/i)).toBeChecked();
      expect(within(radioGroup).getByLabelText(/poco/i)).not.toBeChecked();
      expect(within(radioGroup).getByLabelText(/normal/i)).not.toBeChecked();
      expect(within(radioGroup).getByLabelText(/extra/i)).not.toBeChecked();
    });

    it("renders multiple group options as checkboxes with defaults pre-selected", () => {
      // GIVEN a `multiple` group "Toppings" with two defaults
      // WHEN dialog opens
      // THEN both defaults pre-selected, "Bacon" not
      const group = buildGroup({
        id: "grp-multiple",
        name: "Toppings",
        type: "multiple",
        options: [
          buildOption({ id: "opt-queso", groupId: "grp-multiple", name: "Extra queso", isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-cebolla", groupId: "grp-multiple", name: "Cebolla caramelizada", isDefault: true, sortOrder: 1 }),
          buildOption({ id: "opt-bacon", groupId: "grp-multiple", name: "Bacon", isDefault: false, sortOrder: 2 }),
        ],
      });

      renderDialog({ groups: [group] });

      const groupSection = screen.getByRole("group", { name: /toppings/i });
      expect(groupSection).toBeInTheDocument();

      const checkboxes = within(groupSection).getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(3);

      expect(within(groupSection).getByLabelText(/extra queso/i)).toBeChecked();
      expect(within(groupSection).getByLabelText(/cebolla caramelizada/i)).toBeChecked();
      expect(within(groupSection).getByLabelText(/bacon/i)).not.toBeChecked();
    });

    it("renders text group as a textarea with no option list", () => {
      // GIVEN a `text` group "Comentarios"
      // WHEN dialog opens
      // THEN a textarea is rendered, no options list for that group
      const group = buildGroup({
        id: "grp-text",
        name: "Comentarios",
        type: "text",
        options: [],
      });

      renderDialog({ groups: [group] });

      const textarea = screen.getByRole("textbox", { name: /comentarios/i });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue("");

      // no options (radios/checkboxes) for this group
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("renders single_text group with radio buttons AND textarea, default pre-selected", () => {
      // GIVEN a `single_text` group "Tamaño" with options "Normal" (default), "Grande"
      // WHEN dialog opens
      // THEN radio buttons for both AND a textarea, "Normal" pre-selected
      const group = buildGroup({
        id: "grp-single-text",
        name: "Tamaño",
        type: "single_text",
        options: [
          buildOption({ id: "opt-normal", groupId: "grp-single-text", name: "Normal", isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-grande", groupId: "grp-single-text", name: "Grande", priceDelta: 1000, isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ groups: [group] });

      const radioGroup = screen.getByRole("radiogroup", { name: /tamaño/i });
      const radios = within(radioGroup).getAllByRole("radio");
      expect(radios).toHaveLength(2);
      expect(within(radioGroup).getByLabelText(/normal/i)).toBeChecked();

      const textarea = screen.getByRole("textbox", { name: /tamaño/i });
      expect(textarea).toBeInTheDocument();
    });

    it("renders multiple groups at once (single + multiple combined)", () => {
      // GIVEN product with single group and multiple group
      // WHEN dialog opens
      // THEN both groups rendered
      const singleGroup = buildGroup({
        id: "grp-ice",
        name: "Nivel de hielo",
        type: "single",
        options: [
          buildOption({ id: "opt-sin", groupId: "grp-ice", name: "Sin hielo", isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-extra", groupId: "grp-ice", name: "Extra", isDefault: false, sortOrder: 1 }),
        ],
      });
      const multipleGroup = buildGroup({
        id: "grp-top",
        name: "Toppings",
        type: "multiple",
        options: [
          buildOption({ id: "opt-bacon", groupId: "grp-top", name: "Bacon", isDefault: false, sortOrder: 0 }),
        ],
      });

      renderDialog({ groups: [singleGroup, multipleGroup] });

      expect(screen.getByRole("radiogroup", { name: /nivel de hielo/i })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: /toppings/i })).toBeInTheDocument();
    });

    it("does not render dialog content when open is false", () => {
      // GIVEN dialog closed
      // WHEN open=false
      // THEN no dialog content shown
      const group = buildGroup({ id: "grp-x", name: "Nivel de hielo", type: "single" });
      renderDialog({ groups: [group], open: false });

      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    });
  });

  describe("single group with no default", () => {
    it("renders no option pre-selected when all options have isDefault=false", () => {
      const group = buildGroup({
        id: "grp-nodefault",
        name: "Nivel de hielo",
        type: "single",
        options: [
          buildOption({ id: "opt-sin", groupId: "grp-nodefault", name: "Sin hielo", isDefault: false, sortOrder: 0 }),
          buildOption({ id: "opt-normal", groupId: "grp-nodefault", name: "Normal", isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ groups: [group] });

      const radioGroup = screen.getByRole("radiogroup", { name: /nivel de hielo/i });
      const radios = within(radioGroup).getAllByRole("radio");
      radios.forEach((r) => expect(r).not.toBeChecked());
    });
  });

  describe("required group validation (6.1.2)", () => {
    it("disables Add button when required single group has no selection and no default", () => {
      // GIVEN a required `single` group with no default and no selection
      // WHEN dialog open
      // THEN Add button disabled
      const group = buildGroup({
        id: "grp-req-single",
        name: "Nivel de hielo",
        type: "single",
        required: true,
        options: [
          buildOption({ id: "opt-sin", groupId: "grp-req-single", name: "Sin hielo", isDefault: false, sortOrder: 0 }),
          buildOption({ id: "opt-normal", groupId: "grp-req-single", name: "Normal", isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ groups: [group] });

      expect(screen.getByRole("button", { name: /agregar/i })).toBeDisabled();
    });

    it("enables Add button after selecting an option in required single group", () => {
      // GIVEN required single group, button disabled
      // WHEN user selects "Normal"
      // THEN Add button becomes enabled
      const group = buildGroup({
        id: "grp-req-single2",
        name: "Nivel de hielo",
        type: "single",
        required: true,
        options: [
          buildOption({ id: "opt-sin", groupId: "grp-req-single2", name: "Sin hielo", isDefault: false, sortOrder: 0 }),
          buildOption({ id: "opt-normal", groupId: "grp-req-single2", name: "Normal", isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ groups: [group] });

      expect(screen.getByRole("button", { name: /agregar/i })).toBeDisabled();

      fireEvent.click(screen.getByLabelText(/normal/i));

      expect(screen.getByRole("button", { name: /agregar/i })).toBeEnabled();
    });

    it("disables Add button when required text group textarea is empty", () => {
      // GIVEN required `text` group with empty textarea
      // WHEN dialog open
      // THEN Add button disabled
      const group = buildGroup({
        id: "grp-req-text",
        name: "Comentarios",
        type: "text",
        required: true,
        options: [],
      });

      renderDialog({ groups: [group] });

      expect(screen.getByRole("button", { name: /agregar/i })).toBeDisabled();
    });

    it("enables Add button after typing text in required text group", () => {
      // GIVEN required text group, button disabled
      // WHEN user types "Sin azúcar"
      // THEN Add button enabled
      const group = buildGroup({
        id: "grp-req-text2",
        name: "Comentarios",
        type: "text",
        required: true,
        options: [],
      });

      renderDialog({ groups: [group] });

      expect(screen.getByRole("button", { name: /agregar/i })).toBeDisabled();

      fireEvent.change(screen.getByRole("textbox", { name: /comentarios/i }), {
        target: { value: "Sin azúcar" },
      });

      expect(screen.getByRole("button", { name: /agregar/i })).toBeEnabled();
    });

    it("enables Add button immediately when no groups are required", () => {
      // GIVEN product with only optional groups, defaults pre-selected
      // WHEN dialog opens
      // THEN Add button enabled
      const group = buildGroup({
        id: "grp-opt",
        name: "Nivel de hielo",
        type: "single",
        required: false,
        options: [
          buildOption({ id: "opt-sin", groupId: "grp-opt", name: "Sin hielo", isDefault: true, sortOrder: 0 }),
        ],
      });

      renderDialog({ groups: [group] });

      expect(screen.getByRole("button", { name: /agregar/i })).toBeEnabled();
    });

    it("keeps Add button disabled when one of two required groups is satisfied", () => {
      // GIVEN two required groups, only one satisfied
      // WHEN dialog open
      // THEN Add button remains disabled
      const satisfiedGroup = buildGroup({
        id: "grp-req-a",
        name: "Nivel de hielo",
        type: "single",
        required: true,
        options: [
          buildOption({ id: "opt-a-default", groupId: "grp-req-a", name: "Sin hielo", isDefault: true, sortOrder: 0 }),
        ],
      });
      const unsatisfiedGroup = buildGroup({
        id: "grp-req-b",
        name: "Leche alternativa",
        type: "single",
        required: true,
        options: [
          buildOption({ id: "opt-b-none", groupId: "grp-req-b", name: "Ninguna", isDefault: false, sortOrder: 0 }),
          buildOption({ id: "opt-b-oat", groupId: "grp-req-b", name: "Avena", isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ groups: [satisfiedGroup, unsatisfiedGroup] });

      expect(screen.getByRole("button", { name: /agregar/i })).toBeDisabled();
    });
  });

  describe("running price calculation (6.1.3)", () => {
    it("initial price equals base price plus default surcharges", () => {
      // GIVEN product base 5000 and a default option "Extra hielo" priceDelta=500
      // WHEN dialog opens with defaults pre-selected
      // THEN displayed price is 5500 cents → formatted currency of 55.00
      const product = buildProduct({ price: 5000 });
      const group = buildGroup({
        id: "grp-price-default",
        name: "Nivel de hielo",
        type: "single",
        options: [
          buildOption({ id: "opt-sin", groupId: "grp-price-default", name: "Sin hielo", priceDelta: 0, isDefault: false, sortOrder: 0 }),
          buildOption({ id: "opt-extra", groupId: "grp-price-default", name: "Extra hielo", priceDelta: 500, isDefault: true, sortOrder: 1 }),
        ],
      });

      renderDialog({ product, groups: [group] });

      // 5500 cents → 55.00
      expect(screen.getByTestId("running-price")).toHaveTextContent("55.00");
    });

    it("price increases when user selects option with surcharge", () => {
      // GIVEN product base 5000, "Bacon" surcharge 800 not selected (price 5000)
      // WHEN user checks "Bacon"
      // THEN price becomes 5800
      const product = buildProduct({ price: 5000 });
      const group = buildGroup({
        id: "grp-price-up",
        name: "Toppings",
        type: "multiple",
        options: [
          buildOption({ id: "opt-bacon", groupId: "grp-price-up", name: "Bacon", priceDelta: 800, isDefault: false, sortOrder: 0 }),
        ],
      });

      renderDialog({ product, groups: [group] });

      // 5000 cents → 50.00
      expect(screen.getByTestId("running-price")).toHaveTextContent("50.00");

      fireEvent.click(screen.getByLabelText(/bacon/i));

      // 5800 cents → 58.00
      expect(screen.getByTestId("running-price")).toHaveTextContent("58.00");
    });

    it("price decreases when user unselects a default option", () => {
      // GIVEN product base 5000, "Bacon" selected by default (price 5800)
      // WHEN user unchecks "Bacon"
      // THEN price becomes 5000
      const product = buildProduct({ price: 5000 });
      const group = buildGroup({
        id: "grp-price-down",
        name: "Toppings",
        type: "multiple",
        options: [
          buildOption({ id: "opt-bacon", groupId: "grp-price-down", name: "Bacon", priceDelta: 800, isDefault: true, sortOrder: 0 }),
        ],
      });

      renderDialog({ product, groups: [group] });

      // 5800 cents
      expect(screen.getByTestId("running-price")).toHaveTextContent("58.00");

      fireEvent.click(screen.getByLabelText(/bacon/i));

      // 5000 cents
      expect(screen.getByTestId("running-price")).toHaveTextContent("50.00");
    });

    it("text-only group does not affect price", () => {
      // GIVEN product base 5000 and only a `text` group
      // WHEN user types free text
      // THEN displayed price remains 5000
      const product = buildProduct({ price: 5000 });
      const group = buildGroup({
        id: "grp-text-only",
        name: "Comentarios",
        type: "text",
        options: [],
      });

      renderDialog({ product, groups: [group] });

      expect(screen.getByTestId("running-price")).toHaveTextContent("50.00");

      fireEvent.change(screen.getByRole("textbox", { name: /comentarios/i }), {
        target: { value: "Sin azúcar por favor" },
      });

      expect(screen.getByTestId("running-price")).toHaveTextContent("50.00");
    });
  });

  describe("onConfirm builds SelectedModifier[] (6.1.3 confirm)", () => {
    it("calls onConfirm with default-selected single option when Add clicked", () => {
      const product = buildProduct({ price: 5000 });
      const group = buildGroup({
        id: "grp-confirm-single",
        name: "Nivel de hielo",
        type: "single",
        required: false,
        options: [
          buildOption({ id: "opt-sin", groupId: "grp-confirm-single", name: "Sin hielo", priceDelta: 0, isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-extra", groupId: "grp-confirm-single", name: "Extra hielo", priceDelta: 500, isDefault: false, sortOrder: 1 }),
        ],
      });
      const onConfirm = vi.fn();

      renderDialog({ product, groups: [group], onConfirm });

      fireEvent.click(screen.getByRole("button", { name: /agregar/i }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      const modifiersArg = onConfirm.mock.calls[0][0] as SelectedModifier[];
      expect(modifiersArg).toHaveLength(1);
      expect(modifiersArg[0]).toMatchObject({
        groupId: "grp-confirm-single",
        groupName: "Nivel de hielo",
        optionId: "opt-sin",
        optionName: "Sin hielo",
        priceDelta: 0,
      });
    });

    it("calls onConfirm with updated selection when user changes radio", () => {
      const product = buildProduct({ price: 5000 });
      const group = buildGroup({
        id: "grp-confirm-change",
        name: "Nivel de hielo",
        type: "single",
        options: [
          buildOption({ id: "opt-sin", groupId: "grp-confirm-change", name: "Sin hielo", priceDelta: 0, isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-extra", groupId: "grp-confirm-change", name: "Extra hielo", priceDelta: 500, isDefault: false, sortOrder: 1 }),
        ],
      });
      const onConfirm = vi.fn();

      renderDialog({ product, groups: [group], onConfirm });

      fireEvent.click(screen.getByLabelText(/extra hielo/i));
      fireEvent.click(screen.getByRole("button", { name: /agregar/i }));

      const modifiersArg = onConfirm.mock.calls[0][0] as SelectedModifier[];
      expect(modifiersArg[0]).toMatchObject({
        optionId: "opt-extra",
        optionName: "Extra hielo",
        priceDelta: 500,
      });
    });

    it("captures textValue for text group in onConfirm", () => {
      const product = buildProduct({ price: 5000 });
      const group = buildGroup({
        id: "grp-confirm-text",
        name: "Comentarios",
        type: "text",
        options: [],
      });
      const onConfirm = vi.fn();

      renderDialog({ product, groups: [group], onConfirm });

      fireEvent.change(screen.getByRole("textbox", { name: /comentarios/i }), {
        target: { value: "Sin azúcar" },
      });
      fireEvent.click(screen.getByRole("button", { name: /agregar/i }));

      const modifiersArg = onConfirm.mock.calls[0][0] as SelectedModifier[];
      expect(modifiersArg).toHaveLength(1);
      expect(modifiersArg[0]).toMatchObject({
        groupId: "grp-confirm-text",
        groupName: "Comentarios",
        optionId: null,
        optionName: null,
        textValue: "Sin azúcar",
      });
    });

    it("calls onClose when cancel/close button clicked", () => {
      const group = buildGroup({ id: "grp-close", name: "Nivel de hielo", type: "single" });
      const onClose = vi.fn();

      renderDialog({ groups: [group], onClose });

      fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================================
  // UI refinada: hero, chips, surcharge visible, required indicator,
  // selection summary, sticky footer.
  // ====================================================================
  describe("refined UI", () => {
    it("renders a product hero with name, base price, and image", () => {
      // GIVEN a product with image and price
      // WHEN dialog opens
      // THEN a hero region exposes the product name, base price, and image
      const product = buildProduct({
        name: "Café con leche",
        price: 4200,
        image: "☕",
      });
      const group = buildGroup({ id: "g1", name: "Nivel de hielo", type: "single" });

      renderDialog({ product, groups: [group] });

      const hero = screen.getByTestId("product-hero");
      expect(hero).toBeInTheDocument();
      expect(within(hero).getByText("Café con leche")).toBeInTheDocument();
      // base price rendered in mono-tabular inside the hero
      expect(within(hero).getByTestId("product-base-price")).toHaveTextContent("42.00");
      // image is rendered (could be emoji or url)
      expect(within(hero).getByTestId("product-image")).toBeInTheDocument();
    });

    it("shows surcharge amount next to each option with non-zero priceDelta", () => {
      // GIVEN a group with mix of free and paid options
      // WHEN dialog opens
      // THEN each paid option exposes its surcharge formatted as "+$X.XX"
      const group = buildGroup({
        id: "grp-surcharge",
        name: "Tamaño",
        type: "single",
        options: [
          buildOption({ id: "opt-s", name: "Chico", priceDelta: 0, isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-m", name: "Mediano", priceDelta: 500, isDefault: false, sortOrder: 1 }),
          buildOption({ id: "opt-l", name: "Grande", priceDelta: 1200, isDefault: false, sortOrder: 2 }),
        ],
      });

      renderDialog({ groups: [group] });

      const chico = screen.getByTestId("modifier-option-opt-s");
      const mediano = screen.getByTestId("modifier-option-opt-m");
      const grande = screen.getByTestId("modifier-option-opt-l");

      // free option: no surcharge displayed (or "Incluido" but not a price)
      expect(within(chico).queryByTestId("option-surcharge")).not.toBeInTheDocument();
      // paid options: surcharge displayed with explicit "+" prefix
      expect(within(mediano).getByTestId("option-surcharge")).toHaveTextContent(/\+.*5\.00/);
      expect(within(grande).getByTestId("option-surcharge")).toHaveTextContent(/\+.*12\.00/);
    });

    it("renders negative surcharge (discount) with minus sign", () => {
      // GIVEN a group with a discount option (priceDelta < 0)
      // WHEN dialog opens
      // THEN the discount is rendered with a leading minus sign
      const group = buildGroup({
        id: "grp-discount",
        name: "Promo",
        type: "single",
        options: [
          buildOption({ id: "opt-full", name: "Precio normal", priceDelta: 0, isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-promo", name: "Promo", priceDelta: -1000, isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ groups: [group] });

      const promo = screen.getByTestId("modifier-option-opt-promo");
      // typographic minus (U+2212) and a currency-formatted 10.00
      expect(within(promo).getByTestId("option-surcharge")).toHaveTextContent(/[−-].*10\.00/);
    });

    it("marks the selected option with aria-checked=true and a data-selected attribute", () => {
      // GIVEN a single group with a default option
      // WHEN dialog opens
      // THEN the default option is marked as selected (aria-checked + data attr)
      const group = buildGroup({
        id: "grp-sel",
        name: "Nivel de hielo",
        type: "single",
        options: [
          buildOption({ id: "opt-a", name: "Sin hielo", isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-b", name: "Con hielo", isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ groups: [group] });

      const optA = screen.getByTestId("modifier-option-opt-a");
      const optB = screen.getByTestId("modifier-option-opt-b");

      expect(optA).toHaveAttribute("aria-checked", "true");
      expect(optA).toHaveAttribute("data-selected", "true");
      expect(optB).toHaveAttribute("aria-checked", "false");
      expect(optB).not.toHaveAttribute("data-selected", "true");
    });

    it("renders an explicit 'Requerido' badge on required group headers", () => {
      // GIVEN a required single group
      // WHEN dialog opens
      // THEN the group header exposes a visible "Requerido" indicator
      const group = buildGroup({
        id: "grp-req",
        name: "Nivel de hielo",
        type: "single",
        required: true,
        options: [
          buildOption({ id: "opt-a", name: "Sin hielo", isDefault: false, sortOrder: 0 }),
          buildOption({ id: "opt-b", name: "Con hielo", isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ groups: [group] });

      const groupSection = screen.getByTestId("modifier-group-grp-req");
      expect(within(groupSection).getByTestId("group-required-badge")).toBeInTheDocument();
      expect(within(groupSection).getByTestId("group-required-badge")).toHaveTextContent(/requerido|obligatorio/i);
    });

    it("renders a selection summary in the sticky footer", () => {
      // GIVEN a product with one single group
      // WHEN dialog opens with the default pre-selected
      // THEN the footer summary lists the selected options grouped by groupName
      const group = buildGroup({
        id: "grp-sum",
        name: "Nivel de hielo",
        type: "single",
        options: [
          buildOption({ id: "opt-a", name: "Sin hielo", priceDelta: 0, isDefault: true, sortOrder: 0 }),
        ],
      });

      renderDialog({ groups: [group] });

      const summary = screen.getByTestId("selection-summary");
      expect(summary).toBeInTheDocument();
      expect(within(summary).getByText(/nivel de hielo/i)).toBeInTheDocument();
      expect(within(summary).getByText(/sin hielo/i)).toBeInTheDocument();
    });

    it("summary updates when the user changes selection", () => {
      // GIVEN a single group
      // WHEN user picks the non-default option
      // THEN summary reflects the new choice
      const group = buildGroup({
        id: "grp-sum-change",
        name: "Nivel de hielo",
        type: "single",
        options: [
          buildOption({ id: "opt-a", name: "Sin hielo", priceDelta: 0, isDefault: true, sortOrder: 0 }),
          buildOption({ id: "opt-b", name: "Con hielo", priceDelta: 200, isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ product: buildProduct({ price: 5000 }), groups: [group] });

      fireEvent.click(screen.getByLabelText(/con hielo/i));

      const summary = screen.getByTestId("selection-summary");
      expect(within(summary).getByText(/con hielo/i)).toBeInTheDocument();
      // running price reflects surcharge: 5000 + 200 = 5200 cents → 52.00
      expect(within(summary).getByTestId("summary-total")).toHaveTextContent("52.00");
    });

    it("shows a disabled CTA when a required group is unsatisfied, with the missing group name as hint", () => {
      // GIVEN a required single group with no defaults
      // WHEN dialog opens
      // THEN the CTA is disabled and exposes a hint naming the missing group
      const group = buildGroup({
        id: "grp-missing",
        name: "Tamaño del vaso",
        type: "single",
        required: true,
        options: [
          buildOption({ id: "opt-a", name: "Chico", isDefault: false, sortOrder: 0 }),
          buildOption({ id: "opt-b", name: "Grande", isDefault: false, sortOrder: 1 }),
        ],
      });

      renderDialog({ groups: [group] });

      const cta = screen.getByTestId("confirm-button");
      expect(cta).toBeDisabled();
      // hint names the group
      const hint = screen.getByTestId("confirm-hint");
      expect(hint).toHaveTextContent(/tamaño del vaso/i);
    });

    it("renders the running total prominently in the footer (large mono tabular)", () => {
      // GIVEN a product base 5000 and one option with delta 500 pre-selected
      // WHEN dialog opens
      // THEN the footer shows total = 5500 cents (55.00) in a data-testid hook
      const product = buildProduct({ price: 5000 });
      const group = buildGroup({
        id: "grp-total",
        name: "Toppings",
        type: "multiple",
        options: [
          buildOption({ id: "opt-bacon", name: "Bacon", priceDelta: 500, isDefault: true, sortOrder: 0 }),
        ],
      });

      renderDialog({ product, groups: [group] });

      const total = screen.getByTestId("footer-total");
      expect(total).toHaveTextContent("55.00");
      // footer-total is visually prominent
      expect(total.className).toMatch(/text-(xl|display)/);
      // and uses tabular numerals
      expect(total.className).toMatch(/font-mono/);
    });

    it("does not render any native input[type=radio] or input[type=checkbox] (custom control)", () => {
      // GIVEN any group
      // WHEN dialog opens
      // THEN the DOM uses role=radio/checkbox on custom buttons, not native inputs
      const group = buildGroup({
        id: "grp-custom",
        name: "Toppings",
        type: "multiple",
        options: [
          buildOption({ id: "opt-a", name: "Queso", isDefault: false, sortOrder: 0 }),
        ],
      });

      renderDialog({ groups: [group] });

      expect(document.querySelector('input[type="radio"]')).toBeNull();
      expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    });
  });
});