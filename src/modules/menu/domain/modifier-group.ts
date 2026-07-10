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

  return [...merged.values()];
}

export function buildCartItemKey(productId: string, modifiers: SelectedModifier[]): string {
  const normalized = [...modifiers]
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
    .map((m) => `${m.groupId}:${m.optionId ?? ""}:${m.textValue ?? ""}`)
    .join("|");

  return `${productId}::${normalized}`;
}