import { describe, expect, it } from "bun:test";

import {
  applyFirstOptionFree,
  buildCartItemKey,
  type ModifierGroup,
  type ModifierOption,
  type SelectedModifier,
  resolveProductModifierGroups,
} from "@/modules/menu/domain/modifier-group";
import {
  buildModifierGroup,
  buildModifierOption,
  buildSelectedModifier,
} from "@/modules/menu/test/factories";

describe("resolveProductModifierGroups", () => {
  it("returns an empty list when both category and product have no assignments", () => {
    const result = resolveProductModifierGroups([], []);

    expect(result).toEqual([]);
  });

  it("returns category groups unchanged when product has no assignments", () => {
    const g1 = buildModifierGroup({ id: "g1", name: "Tamaño", sortOrder: 0 });
    const g2 = buildModifierGroup({ id: "g2", name: "Leche", sortOrder: 1 });

    const result = resolveProductModifierGroups([g1, g2], []);

    expect(result).toEqual([g1, g2]);
  });

  it("returns product groups unchanged when category has no assignments", () => {
    const g3 = buildModifierGroup({ id: "g3", name: "Extra", sortOrder: 0 });
    const g4 = buildModifierGroup({ id: "g4", name: "Salsa", sortOrder: 1 });

    const result = resolveProductModifierGroups([], [g3, g4]);

    expect(result).toEqual([g3, g4]);
  });

  it("merges disjoint category and product groups without duplicates", () => {
    const g1 = buildModifierGroup({ id: "g1", name: "Tamaño", sortOrder: 0 });
    const g2 = buildModifierGroup({ id: "g2", name: "Leche", sortOrder: 1 });
    const g3 = buildModifierGroup({ id: "g3", name: "Extra", sortOrder: 2 });

    const result = resolveProductModifierGroups([g1, g2], [g3]);

    expect(result.map((g) => g.id).sort()).toEqual(["g1", "g2", "g3"]);
  });

  it("makes product assignment win when the same group id appears in both", () => {
    const categoryG1 = buildModifierGroup({
      id: "g1",
      name: "Tamaño (cat)",
      sortOrder: 0,
      options: [buildModifierOption({ id: "opt-cat", groupId: "g1", name: "Grande", priceDelta: 0 })],
    });
    const productG1 = buildModifierGroup({
      id: "g1",
      name: "Tamaño (prod)",
      sortOrder: 0,
      options: [
        buildModifierOption({ id: "opt-prod", groupId: "g1", name: "Grande Pro", priceDelta: 100 }),
      ],
    });

    const result = resolveProductModifierGroups([categoryG1], [productG1]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
    expect(result[0].name).toBe("Tamaño (prod)");
    expect(result[0].options.map((o) => o.id)).toEqual(["opt-prod"]);
  });

  it("sorts the merged result by sortOrder, regardless of whether a group comes from category or product assignment", () => {
    // GIVEN a category group that should appear AFTER a product group because
    // the product group has a lower sortOrder.
    const categoryHielo = buildModifierGroup({ id: "g-hielo", name: "Hielo", sortOrder: 1 });
    const productTamano = buildModifierGroup({ id: "g-tamano", name: "Tamaño", sortOrder: 0 });

    const result = resolveProductModifierGroups([categoryHielo], [productTamano]);

    expect(result.map((g) => g.id)).toEqual(["g-tamano", "g-hielo"]);
  });
});

describe("buildCartItemKey", () => {
  it("returns the same key for identical productId and identical modifier selection", () => {
    const productId = "p1";
    const modifiers: SelectedModifier[] = [
      buildSelectedModifier({ groupId: "g1", optionId: "opt1", textValue: null, priceDelta: 100 }),
      buildSelectedModifier({ groupId: "g2", optionId: null, textValue: "sin hielo", priceDelta: 0 }),
    ];

    const keyA = buildCartItemKey(productId, modifiers);
    const keyB = buildCartItemKey(productId, [...modifiers]);

    expect(keyA).toBe(keyB);
  });

  it("returns a different key when the modifier selection differs", () => {
    const productId = "p1";
    const modifiersA: SelectedModifier[] = [
      buildSelectedModifier({ groupId: "g1", optionId: "opt1", textValue: null, priceDelta: 100 }),
    ];
    const modifiersB: SelectedModifier[] = [
      buildSelectedModifier({ groupId: "g1", optionId: "opt2", textValue: null, priceDelta: 200 }),
    ];

    const keyA = buildCartItemKey(productId, modifiersA);
    const keyB = buildCartItemKey(productId, modifiersB);

    expect(keyA).not.toBe(keyB);
  });

  it("is order-insensitive: same modifiers in different order produce the same key", () => {
    const productId = "p1";
    const m1 = buildSelectedModifier({ groupId: "g1", optionId: "opt1", textValue: null, priceDelta: 100 });
    const m2 = buildSelectedModifier({ groupId: "g2", optionId: null, textValue: "sin hielo", priceDelta: 0 });

    const keyA = buildCartItemKey(productId, [m1, m2]);
    const keyB = buildCartItemKey(productId, [m2, m1]);

    expect(keyA).toBe(keyB);
  });
});

describe("applyFirstOptionFree", () => {
  function buildMultipleGroup(
    id: string,
    firstOptionFree: boolean,
    options: ModifierOption[],
  ): ModifierGroup {
    return buildModifierGroup({
      type: "multiple",
      firstOptionFree,
      options,
      id,
      name: `group-${id}`,
    });
  }

  it("returns modifiers unchanged when group is not multiple", () => {
    const group: ModifierGroup = {
      ...buildMultipleGroup("g1", true, []),
      type: "single",
    };
    const selected = [
      buildSelectedModifier({ groupId: "g1", optionId: "opt1", textValue: null, priceDelta: 500 }),
    ];

    const result = applyFirstOptionFree(group, selected);

    expect(result).toEqual(selected);
  });

  it("returns modifiers unchanged when firstOptionFree is false", () => {
    const group = buildMultipleGroup("g1", false, [
      buildModifierOption({ id: "opt1", groupId: "g1", name: "Queso", priceDelta: 200 }),
      buildModifierOption({ id: "opt2", groupId: "g1", name: "Jamón", priceDelta: 300 }),
    ]);
    const selected = [
      buildSelectedModifier({ groupId: "g1", optionId: "opt1", textValue: null, priceDelta: 200 }),
      buildSelectedModifier({ groupId: "g1", optionId: "opt2", textValue: null, priceDelta: 300 }),
    ];

    const result = applyFirstOptionFree(group, selected);

    expect(result).toEqual(selected);
  });

  it("zeroes priceDelta of the first option by sortOrder when firstOptionFree is true", () => {
    const group = buildMultipleGroup("g1", true, [
      buildModifierOption({ id: "opt1", groupId: "g1", name: "Queso", priceDelta: 200, sortOrder: 1 }),
      buildModifierOption({ id: "opt2", groupId: "g1", name: "Jamón", priceDelta: 300, sortOrder: 0 }),
    ]);
    const selected = [
      buildSelectedModifier({ groupId: "g1", optionId: "opt1", textValue: null, priceDelta: 200 }),
      buildSelectedModifier({ groupId: "g1", optionId: "opt2", textValue: null, priceDelta: 300 }),
    ];

    const result = applyFirstOptionFree(group, selected);

    // opt2 has sortOrder 0 → first → priceDelta becomes 0
    // opt1 has sortOrder 1 → second → keeps priceDelta 200
    expect(result).toHaveLength(2);
    expect(result.find((m) => m.optionId === "opt2")?.priceDelta).toBe(0);
    expect(result.find((m) => m.optionId === "opt1")?.priceDelta).toBe(200);
  });

  it("handles single selection: the only option becomes free", () => {
    const group = buildMultipleGroup("g1", true, [
      buildModifierOption({ id: "opt1", groupId: "g1", name: "Queso", priceDelta: 200 }),
    ]);
    const selected = [
      buildSelectedModifier({ groupId: "g1", optionId: "opt1", textValue: null, priceDelta: 200 }),
    ];

    const result = applyFirstOptionFree(group, selected);

    expect(result).toHaveLength(1);
    expect(result[0].priceDelta).toBe(0);
  });

  it("preserves other fields when zeroing priceDelta", () => {
    const group = buildMultipleGroup("g1", true, [
      buildModifierOption({ id: "opt1", groupId: "g1", name: "Queso", priceDelta: 200 }),
    ]);
    const selected = [
      buildSelectedModifier({
        groupId: "g1",
        optionId: "opt1",
        optionName: "option-opt1",
        textValue: null,
        priceDelta: 200,
      }),
    ];

    const result = applyFirstOptionFree(group, selected);

    expect(result[0].groupId).toBe("g1");
    expect(result[0].optionId).toBe("opt1");
    expect(result[0].optionName).toBe("option-opt1");
    expect(result[0].textValue).toBeNull();
  });

  it("returns empty array when no modifiers selected", () => {
    const group = buildMultipleGroup("g1", true, [
      buildModifierOption({ id: "opt1", groupId: "g1", name: "Queso", priceDelta: 200 }),
    ]);

    const result = applyFirstOptionFree(group, []);

    expect(result).toEqual([]);
  });

  it("ignores options not present in the group when sorting", () => {
    const group = buildMultipleGroup("g1", true, [
      buildModifierOption({ id: "opt1", groupId: "g1", name: "Queso", priceDelta: 200, sortOrder: 1 }),
      buildModifierOption({ id: "opt2", groupId: "g1", name: "Jamón", priceDelta: 300, sortOrder: 0 }),
    ]);
    const selected = [
      buildSelectedModifier({ groupId: "g1", optionId: "opt1", textValue: null, priceDelta: 200 }),
      buildSelectedModifier({ groupId: "g1", optionId: "opt_unknown", textValue: null, priceDelta: 999 }),
    ];

    const result = applyFirstOptionFree(group, selected);

    // opt_unknown has no sortOrder → treated as Infinity → goes last
    // opt1 has sortOrder 1 → first → priceDelta becomes 0
    expect(result.find((m) => m.optionId === "opt1")?.priceDelta).toBe(0);
    expect(result.find((m) => m.optionId === "opt_unknown")?.priceDelta).toBe(999);
  });
});
