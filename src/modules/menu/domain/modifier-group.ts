export type ModifierGroupType = "single" | "multiple" | "text" | "single_text";

export interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: ModifierGroupType;
  required: boolean;
  sortOrder: number;
  firstOptionFree: boolean;
  options: ModifierOption[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string | null;
  optionName: string | null;
  priceDelta: number;
  textValue: string | null;
}

export interface CartItemModifier {
  groupId: string;
  groupName: string;
  optionId: string | null;
  optionName: string | null;
  priceDelta: number;
  textValue: string | null;
}

export function resolveProductModifierGroups(
  categoryGroups: ModifierGroup[],
  productGroups: ModifierGroup[],
): ModifierGroup[] {
  const merged = new Map<string, ModifierGroup>();

  for (const group of categoryGroups) {
    merged.set(group.id, group);
  }

  for (const group of productGroups) {
    merged.set(group.id, group);
  }

  return [...merged.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function buildCartItemKey(productId: string, modifiers: SelectedModifier[]): string {
  const normalized = [...modifiers]
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map((m) => `${m.groupId}:${m.optionId ?? ""}:${m.textValue ?? ""}`)
    .join("|");

  return `${productId}::${normalized}`;
}

/**
 * When a modifier group has `type === "multiple"` and `firstOptionFree === true`,
 * this function zeroes the `priceDelta` of the first selected option (ordered by
 * the option's `sortOrder`). All subsequent selected options keep their original
 * `priceDelta`.
 *
 * For non-multiple groups or when `firstOptionFree` is `false`, the modifiers
 * are returned unchanged.
 */
export function applyFirstOptionFree(
  group: ModifierGroup,
  selected: SelectedModifier[],
): SelectedModifier[] {
  if (group.type !== "multiple" || !group.firstOptionFree) {
    return selected;
  }

  if (selected.length === 0) {
    return [];
  }

  // Build a lookup of optionId → sortOrder from the group's options
  const optionSortOrders = new Map<string, number>();
  for (const option of group.options) {
    optionSortOrders.set(option.id, option.sortOrder);
  }

  // Sort selected modifiers by their corresponding option's sortOrder.
  // Options not found in the group are treated as Infinity (go last).
  const sorted = [...selected].sort((a, b) => {
    const orderA = a.optionId ? (optionSortOrders.get(a.optionId) ?? Infinity) : Infinity;
    const orderB = b.optionId ? (optionSortOrders.get(b.optionId) ?? Infinity) : Infinity;
    return orderA - orderB;
  });

  // Zero the priceDelta of the first one, keep the rest as-is
  return sorted.map((modifier, index) =>
    index === 0 ? Object.assign({}, modifier, { priceDelta: 0 }) : modifier,
  );
}