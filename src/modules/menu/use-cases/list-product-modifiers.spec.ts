import { describe, expect, it, mock } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroupRepository } from "@/modules/menu/domain/ports";
import { listProductModifiers } from "@/modules/menu/use-cases/list-product-modifiers";
import { buildModifierGroup, buildModifierOption } from "@/modules/menu/test/factories";

describe("listProductModifiers", () => {
  it("merges disjoint category and product groups", async () => {
    const categoryGroups = [
      buildModifierGroup({ id: "g1", name: "Tamaño", sortOrder: 0 }),
      buildModifierGroup({ id: "g2", name: "Leche", sortOrder: 1 }),
    ];
    const productGroups = [buildModifierGroup({ id: "g3", name: "Extra", sortOrder: 2 })];

    const listByCategorySpy = mock(() => okAsync(categoryGroups));
    const listByProductSpy = mock(() => okAsync(productGroups));
    const mockRepository = {
      listByCategory: listByCategorySpy,
      listByProduct: listByProductSpy,
    } as unknown as ModifierGroupRepository;

    const result = await listProductModifiers(mockRepository, "c1", "p1");

    expect(listByCategorySpy).toHaveBeenCalledWith("c1");
    expect(listByProductSpy).toHaveBeenCalledWith("p1");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.map((g) => g.id).sort()).toEqual(["g1", "g2", "g3"]);
  });

  it("product assignment wins on conflict (same groupId in both)", async () => {
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

    const mockRepository = {
      listByCategory: () => okAsync([categoryG1]),
      listByProduct: () => okAsync([productG1]),
    } as unknown as ModifierGroupRepository;

    const result = await listProductModifiers(mockRepository, "c1", "p1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.name).toBe("Tamaño (prod)");
    expect(result.value[0]!.options.map((o) => o.id)).toEqual(["opt-prod"]);
  });

  it("returns empty list when both category and product have no assignments", async () => {
    const mockRepository = {
      listByCategory: () => okAsync([]),
      listByProduct: () => okAsync([]),
    } as unknown as ModifierGroupRepository;

    const result = await listProductModifiers(mockRepository, "c9", "p9");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toEqual([]);
  });

  it("propagates errors from listByCategory", async () => {
    const dbError = new MenuDomainError("Failed to list by category");
    const mockRepository = {
      listByCategory: () => errAsync(dbError),
      listByProduct: () => okAsync([]),
    } as unknown as ModifierGroupRepository;

    const result = await listProductModifiers(mockRepository, "c1", "p1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected listProductModifiers to propagate listByCategory error");
    }
    expect(result.error).toBe(dbError);
  });

  it("propagates errors from listByProduct", async () => {
    const dbError = new MenuDomainError("Failed to list by product");
    const mockRepository = {
      listByCategory: () => okAsync([]),
      listByProduct: () => errAsync(dbError),
    } as unknown as ModifierGroupRepository;

    const result = await listProductModifiers(mockRepository, "c1", "p1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected listProductModifiers to propagate listByProduct error");
    }
    expect(result.error).toBe(dbError);
  });
});
