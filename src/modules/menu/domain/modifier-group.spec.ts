import { describe, expect, it } from "vitest";

import {
  buildCartItemKey,
  type ModifierGroup,
  type ModifierOption,
  type SelectedModifier,
  resolveProductModifierGroups,
} from "@/modules/menu/domain/modifier-group";

function buildOption(id: string, groupId: string, name: string, priceDelta = 0): ModifierOption {
  return {
    id,
    groupId,
    name,
    priceDelta,
    isDefault: false,
    sortOrder: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

function buildGroup(
  id: string,
  name: string,
  sortOrder: number,
  options: ModifierOption[] = [],
): ModifierGroup {
  return {
    id,
    name,
    type: "single",
    required: false,
    sortOrder,
    options,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

function buildSelected(
  groupId: string,
  optionId: string | null,
  textValue: string | null,
  priceDelta = 0,
): SelectedModifier {
  return {
    groupId,
    groupName: `group-${groupId}`,
    optionId,
    optionName: optionId ? `option-${optionId}` : null,
    priceDelta,
    textValue,
  };
}

describe("resolveProductModifierGroups", () => {
  it("returns an empty list when both category and product have no assignments", () => {
    const result = resolveProductModifierGroups([], []);

    expect(result).toEqual([]);
  });

  it("returns category groups unchanged when product has no assignments", () => {
    const g1 = buildGroup("g1", "Tamaño", 0);
    const g2 = buildGroup("g2", "Leche", 1);

    const result = resolveProductModifierGroups([g1, g2], []);

    expect(result).toEqual([g1, g2]);
  });

  it("returns product groups unchanged when category has no assignments", () => {
    const g3 = buildGroup("g3", "Extra", 0);
    const g4 = buildGroup("g4", "Salsa", 1);

    const result = resolveProductModifierGroups([], [g3, g4]);

    expect(result).toEqual([g3, g4]);
  });

  it("merges disjoint category and product groups without duplicates", () => {
    const g1 = buildGroup("g1", "Tamaño", 0);
    const g2 = buildGroup("g2", "Leche", 1);
    const g3 = buildGroup("g3", "Extra", 2);

    const result = resolveProductModifierGroups([g1, g2], [g3]);

    expect(result.map((g) => g.id).sort()).toEqual(["g1", "g2", "g3"]);
  });

  it("makes product assignment win when the same group id appears in both", () => {
    const categoryG1 = buildGroup("g1", "Tamaño (cat)", 0, [
      buildOption("opt-cat", "g1", "Grande", 0),
    ]);
    const productG1 = buildGroup("g1", "Tamaño (prod)", 0, [
      buildOption("opt-prod", "g1", "Grande Pro", 100),
    ]);

    const result = resolveProductModifierGroups([categoryG1], [productG1]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
    expect(result[0].name).toBe("Tamaño (prod)");
    expect(result[0].options.map((o) => o.id)).toEqual(["opt-prod"]);
  });
});

describe("buildCartItemKey", () => {
  it("returns the same key for identical productId and identical modifier selection", () => {
    const productId = "p1";
    const modifiers: SelectedModifier[] = [
      buildSelected("g1", "opt1", null, 100),
      buildSelected("g2", null, "sin hielo", 0),
    ];

    const keyA = buildCartItemKey(productId, modifiers);
    const keyB = buildCartItemKey(productId, [...modifiers]);

    expect(keyA).toBe(keyB);
  });

  it("returns a different key when the modifier selection differs", () => {
    const productId = "p1";
    const modifiersA: SelectedModifier[] = [buildSelected("g1", "opt1", null, 100)];
    const modifiersB: SelectedModifier[] = [buildSelected("g1", "opt2", null, 200)];

    const keyA = buildCartItemKey(productId, modifiersA);
    const keyB = buildCartItemKey(productId, modifiersB);

    expect(keyA).not.toBe(keyB);
  });

  it("is order-insensitive: same modifiers in different order produce the same key", () => {
    const productId = "p1";
    const m1 = buildSelected("g1", "opt1", null, 100);
    const m2 = buildSelected("g2", null, "sin hielo", 0);

    const keyA = buildCartItemKey(productId, [m1, m2]);
    const keyB = buildCartItemKey(productId, [m2, m1]);

    expect(keyA).toBe(keyB);
  });
});