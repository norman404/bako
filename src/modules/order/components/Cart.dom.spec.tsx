import { describe, expect, it, mock, beforeEach } from "bun:test";



import { renderWithProviders, screen, within } from "@/test/test-utils";
import { Cart } from "@/modules/order/components/Cart";
import type { CartItem } from "@/modules/order/domain/cart";
import { buildSelectedModifier } from "@/modules/menu/test/factories";
import { buildCartItem } from "@/modules/order/test/factories";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";

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
    const item = buildCartItem({
      selectedModifiers: [
        buildSelectedModifier({ groupName: "Nivel de hielo", optionName: "Sin hielo" }),
        buildSelectedModifier({ groupId: "grp-2", groupName: "Leche", optionId: "opt-2", optionName: "Avena", priceDelta: 500 }),
      ],
    });

    renderCart({ items: [item] });

    // Each chip displays "GroupName: OptionName"
    expect(screen.getByText(/nivel de hielo: sin hielo/i)).toBeInTheDocument();
    expect(screen.getByText(/leche: avena/i)).toBeInTheDocument();
  });

  it("falls back to optionName only when groupName is missing (legacy data)", () => {
    const item = buildCartItem({
      selectedModifiers: [
        // groupName is null
        { ...buildSelectedModifier({ optionName: "Solo el option" }), groupName: null as unknown as string },
      ],
    });

    renderCart({ items: [item] });

    expect(screen.getByText(/solo el option/i)).toBeInTheDocument();
  });

  it("shows textValue for text-only modifiers (no groupName prefix when text is present)", () => {
    const item = buildCartItem({
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
    const item = buildCartItem({ selectedModifiers: [] });

    renderCart({ items: [item] });

    // The modifier chips list should be absent
    expect(screen.queryByTestId("cart-item-modifiers")).not.toBeInTheDocument();
  });

  it("hides the modifier display when the modifier_groups_enabled flag is OFF", () => {
    setModifierFlag(false);
    const item = buildCartItem({
      selectedModifiers: [buildSelectedModifier()],
    });

    renderCart({ items: [item] });

    // No chip rendered even though the item has modifiers
    expect(screen.queryByTestId("cart-item-modifiers")).not.toBeInTheDocument();
  });

  it("groups modifiers by groupName so chips with the same group are visually close", () => {
    const item = buildCartItem({
      selectedModifiers: [
        buildSelectedModifier({ groupId: "g1", groupName: "Toppings", optionId: "o1", optionName: "Queso", priceDelta: 200 }),
        buildSelectedModifier({ groupId: "g1", groupName: "Toppings", optionId: "o2", optionName: "Bacon", priceDelta: 500 }),
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
