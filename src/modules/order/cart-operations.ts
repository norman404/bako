import { isScheduleActive } from "@/lib/weekly-schedule";
import {
  buildCartItemKey,
  calculateItemUnitPrice,
  type Product,
  type SelectedModifier,
} from "@/modules/menu";

export interface CartCompositeComponent {
  product: Product;
  quantity: number;
}

export interface CartComposite {
  components: CartCompositeComponent[];
}

export interface CartItem {
  lineId: string;
  product: Product;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  // One timestamp per unit, oldest first: a promotion applies to a unit if it was active
  // when that unit was added. Invariant: unitAddedAt.length === quantity.
  unitAddedAt: number[];
  // Present only for a composite product added while its bundle price was active.
  composite?: CartComposite;
}

export interface CartTotals {
  itemsCount: number;
  total: number;
}

export function calculateCartTotals(items: CartItem[]): CartTotals {
  const itemsCount = items.reduce((total, item) => total + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + calculateItemUnitPrice(item.product, item.selectedModifiers) * item.quantity,
    0,
  );

  return {
    itemsCount,
    total,
  };
}

function addUnit(item: CartItem, addedAt: number): CartItem {
  return { ...item, quantity: item.quantity + 1, unitAddedAt: [...item.unitAddedAt, addedAt] };
}

export function addItemToCart(
  items: CartItem[],
  product: Product,
  modifiers: SelectedModifier[],
  lineId: string,
  addedAt: number,
): CartItem[] {
  const newItemKey = buildCartItemKey(product.id, modifiers);
  const existingItem = items.find(
    (item) => !item.composite && buildCartItemKey(item.product.id, item.selectedModifiers) === newItemKey,
  );

  if (existingItem) {
    return items.map((item) =>
      item.lineId === existingItem.lineId ? addUnit(item, addedAt) : item,
    );
  }

  return [...items, { lineId, product, quantity: 1, selectedModifiers: modifiers, unitAddedAt: [addedAt] }];
}

export function isCompositeActive(product: Product, at: number): boolean {
  return product.availabilitySchedule === null || isScheduleActive(product.availabilitySchedule, new Date(at));
}

function addComponentsSeparately(
  items: CartItem[],
  components: CartCompositeComponent[],
  createLineId: () => string,
  addedAt: number,
): CartItem[] {
  return components.reduce(
    (current, component) =>
      Array.from({ length: component.quantity }).reduce<CartItem[]>(
        (next) => addItemToCart(next, component.product, [], createLineId(), addedAt),
        current,
      ),
    items,
  );
}

// Inside its schedule a composite is one line at the bundle price; outside it, the customer
// simply gets the included products at their regular prices, as if picked one by one.
export function addCompositeToCart(
  items: CartItem[],
  product: Product,
  components: CartCompositeComponent[],
  createLineId: () => string,
  addedAt: number,
): CartItem[] {
  if (!isCompositeActive(product, addedAt)) {
    return addComponentsSeparately(items, components, createLineId, addedAt);
  }

  const existing = items.find((item) => item.composite && item.product.id === product.id);
  if (existing) {
    return items.map((item) => (item.lineId === existing.lineId ? addUnit(item, addedAt) : item));
  }

  return [
    ...items,
    {
      lineId: createLineId(),
      product,
      quantity: 1,
      selectedModifiers: [],
      unitAddedAt: [addedAt],
      composite: { components },
    },
  ];
}

export function incrementItemQuantity(
  items: CartItem[],
  lineId: string,
  addedAt: number,
  createLineId: () => string = () => crypto.randomUUID(),
): CartItem[] {
  const target = items.find((item) => item.lineId === lineId);
  if (!target) return items;

  if (target.composite && !isCompositeActive(target.product, addedAt)) {
    return addComponentsSeparately(items, target.composite.components, createLineId, addedAt);
  }

  return items.map((item) => (item.lineId === lineId ? addUnit(item, addedAt) : item));
}

// Kitchens prepare the included products, so composite lines are expanded before routing.
export function expandCompositeItems(items: CartItem[]): CartItem[] {
  return items.flatMap((item) =>
    item.composite
      ? item.composite.components.map((component, index) => ({
          lineId: `${item.lineId}:${index}`,
          product: component.product,
          quantity: component.quantity * item.quantity,
          selectedModifiers: [],
          unitAddedAt: [],
        }))
      : [item],
  );
}

export function decrementItemQuantity(items: CartItem[], lineId: string): CartItem[] {
  const exists = items.some((item) => item.lineId === lineId);
  if (!exists) return items;

  return items
    .map((item) =>
      item.lineId === lineId
        ? { ...item, quantity: item.quantity - 1, unitAddedAt: item.unitAddedAt.slice(0, -1) }
        : item,
    )
    .filter((item) => item.quantity > 0);
}

export function removeItemFromCart(items: CartItem[], lineId: string): CartItem[] {
  const exists = items.some((item) => item.lineId === lineId);
  if (!exists) return items;

  return items.filter((item) => item.lineId !== lineId);
}