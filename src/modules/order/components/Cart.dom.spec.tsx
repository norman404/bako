import { describe, expect, it, mock, beforeEach } from "bun:test";
import * as React from "react";



import { renderWithProviders, screen, within } from "@/test/test-utils";
import { Cart } from "@/modules/order/components/Cart";
import type { CartItem } from "@/modules/order/domain/cart";
import type { Product } from "@/modules/menu/domain/product";
import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    categoryId: "cat-1",
    menuIds: ["menu-1"],
    name: "Café",
    description: "Café caliente",
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

function buildModifier(overrides: Partial<SelectedModifier> = {}): SelectedModifier {
  return {
    groupId: "grp-1",
    groupName: "Nivel de hielo",
    optionId: "opt-1",
    optionName: "Sin hielo",
    priceDelta: 0,
    textValue: null,
    ...overrides,
  };
}

function buildItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    lineId: "line-1",
    product: buildProduct(),
    quantity: 1,
    selectedModifiers: [],
    ...overrides,
  };
}

function setModifierFlag(value: boolean) {
  useFeatureFlagsStore.setState({
    flags: { ...useFeatureFlagsStore.getState().flags, modifier_groups_enabled: value },
  });
}

function renderCart(props: {
  items?: CartItem[];
  onIncreaseQuantity?: (lineId: string) => void;
  onDecreaseQuantity?: (lineId: string) => void;
  onRemoveItem?: (lineId: string) => void;
  onClearCart?: () => void;
  onCheckout?: () => void;
} = {}) {
  const items = props.items ?? [];
  return renderWithProviders(
    <Cart
      items={items}
      onIncreaseQuantity={props.onIncreaseQuantity ?? mock()}
      onDecreaseQuantity={props.onDecreaseQuantity ?? mock()}
      onRemoveItem={props.onRemoveItem ?? mock()}
      onClearCart={props.onClearCart ?? mock()}
      onCheckout={props.onCheckout ?? mock()}
    />,
  );
}

describe("Cart modifier display", () => {
  beforeEach(() => {
    mock.restore();
    setModifierFlag(true);
  });

  it("shows the groupName as a prefix on each modifier chip when present", () => {
    const item = buildItem({
      selectedModifiers: [
        buildModifier({ groupName: "Nivel de hielo", optionName: "Sin hielo" }),
        buildModifier({ groupId: "grp-2", groupName: "Leche", optionId: "opt-2", optionName: "Avena", priceDelta: 500 }),
      ],
    });

    renderCart({ items: [item] });

    // Each chip displays "GroupName: OptionName"
    expect(screen.getByText(/nivel de hielo: sin hielo/i)).toBeInTheDocument();
    expect(screen.getByText(/leche: avena/i)).toBeInTheDocument();
  });

  it("falls back to optionName only when groupName is missing (legacy data)", () => {
    const item = buildItem({
      selectedModifiers: [
        // groupName is null
        { ...buildModifier({ optionName: "Solo el option" }), groupName: null as unknown as string },
      ],
    });

    renderCart({ items: [item] });

    expect(screen.getByText(/solo el option/i)).toBeInTheDocument();
  });

  it("shows textValue for text-only modifiers (no groupName prefix when text is present)", () => {
    const item = buildItem({
      selectedModifiers: [
        {
          groupId: "grp-1",
          groupName: "Comentarios",
          optionId: null,
          optionName: null,
          priceDelta: 0,
          textValue: "Sin azúcar por favor",
        },
      ],
    });

    renderCart({ items: [item] });

    // The chip shows the raw text value, prefixed by the group name
    expect(screen.getByText(/comentarios: sin azúcar por favor/i)).toBeInTheDocument();
  });

  it("does not render the modifiers list when the item has no modifiers", () => {
    const item = buildItem({ selectedModifiers: [] });

    renderCart({ items: [item] });

    // The modifier chips list should be absent
    expect(screen.queryByTestId("cart-item-modifiers")).not.toBeInTheDocument();
  });

  it("hides the modifier display when the modifier_groups_enabled flag is OFF", () => {
    setModifierFlag(false);
    const item = buildItem({
      selectedModifiers: [buildModifier()],
    });

    renderCart({ items: [item] });

    // No chip rendered even though the item has modifiers
    expect(screen.queryByTestId("cart-item-modifiers")).not.toBeInTheDocument();
  });

  it("groups modifiers by groupName so chips with the same group are visually close", () => {
    const item = buildItem({
      selectedModifiers: [
        buildModifier({ groupId: "g1", groupName: "Toppings", optionId: "o1", optionName: "Queso", priceDelta: 200 }),
        buildModifier({ groupId: "g1", groupName: "Toppings", optionId: "o2", optionName: "Bacon", priceDelta: 500 }),
      ],
    });

    const { container } = renderCart({ items: [item] });

    // Both chips live inside a single group container
    const groups = container.querySelectorAll('[data-testid="modifier-group"]');
    expect(groups).toHaveLength(1);
    const opts = within(groups[0] as HTMLElement).getAllByTestId("modifier-chip");
    expect(opts).toHaveLength(2);
  });
});
