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
  // Multiple-choice groups only: an option can be picked several times (e.g. extra cheese ×2),
  // stored as one SelectedModifier per unit so pricing and the first-free rule stay per unit.
  allowRepeat: boolean;
  maxRepeat: number;
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

function modifierIdentity(modifier: SelectedModifier): string {
  return `${modifier.groupId}:${modifier.optionId ?? ""}:${modifier.textValue ?? ""}`;
}

// Sorted by the full identity so the same picks in a different order share one cart line,
// while "cheese ×2" and "cheese ×1" stay distinct.
export function buildCartItemKey(productId: string, modifiers: SelectedModifier[]): string {
  const normalized = modifiers.map(modifierIdentity).sort().join("|");

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
export interface RepeatedModifier {
  modifier: SelectedModifier;
  quantity: number;
  totalDelta: number;
}

// Collapses repeated picks of the same option for display ("Extra cheese ×2"), summing what
// each unit costs, so a first-free unit and a paid one read as one line with the right total.
export function groupRepeatedModifiers(modifiers: SelectedModifier[]): RepeatedModifier[] {
  const groups = new Map<string, RepeatedModifier>();
  for (const modifier of modifiers) {
    const key = modifierIdentity(modifier);
    const existing = groups.get(key);
    if (existing) {
      existing.quantity += 1;
      existing.totalDelta += modifier.priceDelta;
    } else {
      groups.set(key, { modifier, quantity: 1, totalDelta: modifier.priceDelta });
    }
  }
  return [...groups.values()];
}

export function formatRepeatedModifierLabel(entry: RepeatedModifier): string {
  const label = entry.modifier.optionName ?? entry.modifier.textValue ?? "";
  return entry.quantity > 1 ? `${label} ×${entry.quantity}` : label;
}

export interface PrintableModifier {
  groupName: string;
  optionName: string | null;
  textValue: string | null;
}

interface PrintableModifierSource extends PrintableModifier {
  optionId: string | null;
}

// Receipts and kitchen tickets print a repeated option once with its count ("Extra ×2").
export function collapseModifiersForPrint(modifiers: PrintableModifierSource[]): PrintableModifier[] {
  const collapsed = new Map<string, { modifier: PrintableModifierSource; quantity: number }>();
  for (const modifier of modifiers) {
    const key = `${modifier.groupName}:${modifier.optionId ?? ""}:${modifier.textValue ?? ""}`;
    const existing = collapsed.get(key);
    if (existing) existing.quantity += 1;
    else collapsed.set(key, { modifier, quantity: 1 });
  }

  return [...collapsed.values()].map(({ modifier, quantity }) => ({
    groupName: modifier.groupName,
    optionName: modifier.optionName !== null && quantity > 1 ? `${modifier.optionName} ×${quantity}` : modifier.optionName,
    textValue: modifier.textValue,
  }));
}
