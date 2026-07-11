import { describe, expect, it, vi } from "vitest";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "@/modules/menu/domain/errors";
import type {
  ModifierGroupRepository,
} from "@/modules/menu/domain/ports";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import { listProductModifierGroupsBatch } from "@/modules/menu/use-cases/list-product-modifier-groups-batch";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

function buildGroup(overrides: Partial<ModifierGroup> = {}): ModifierGroup {
  return {
    id: overrides.id ?? "g1",
    name: overrides.name ?? "Group",
    type: overrides.type ?? "single",
    required: overrides.required ?? false,
    sortOrder: overrides.sortOrder ?? 0,
    options: overrides.options ?? [],
    createdAt: overrides.createdAt ?? FIXED_DATE,
    updatedAt: overrides.updatedAt ?? FIXED_DATE,
    deletedAt: overrides.deletedAt ?? null,
    ...overrides,
  };
}

interface BatchInput {
  productId: string;
  categoryId: string;
}

describe("listProductModifierGroupsBatch", () => {
  it("returns an empty map for an empty product list (no queries are issued)", async () => {
    const listByCategoryIds = vi.fn();
    const listByProductIds = vi.fn();
    const repo = { listByCategoryIds, listByProductIds } as unknown as ModifierGroupRepository;

    const result = await listProductModifierGroupsBatch(repo, []);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual({});
    expect(listByCategoryIds).not.toHaveBeenCalled();
    expect(listByProductIds).not.toHaveBeenCalled();
  });

  it("deduplicates categoryIds before querying (N=50 products in 1 category → 1 query per side)", async () => {
    const products: BatchInput[] = Array.from({ length: 50 }, (_, i) => ({
      productId: `p${i}`,
      categoryId: "cat-A",
    }));

    const listByCategoryIds = vi.fn((_ids: string[]) =>
      okAsync(new Map([["cat-A", [buildGroup({ id: "g-cat" })]]])),
    );
    const listByProductIds = vi.fn((_ids: string[]) => okAsync(new Map<string, ModifierGroup[]>([])));
    const repo = { listByCategoryIds, listByProductIds } as unknown as ModifierGroupRepository;

    const result = await listProductModifierGroupsBatch(repo, products);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(listByCategoryIds).toHaveBeenCalledTimes(1);
    expect(listByCategoryIds).toHaveBeenCalledWith(["cat-A"]);
    expect(listByProductIds).toHaveBeenCalledTimes(1);
    expect(listByProductIds).toHaveBeenCalledWith(expect.arrayContaining(["p0", "p49"]));
  });

  it("resolves per-product the union of category groups + product groups", async () => {
    const products: BatchInput[] = [
      { productId: "p1", categoryId: "cat-A" },
      { productId: "p2", categoryId: "cat-B" },
    ];

    const listByCategoryIds = vi.fn((_ids: string[]) =>
      okAsync(
        new Map<string, ModifierGroup[]>([
          ["cat-A", [buildGroup({ id: "g-cat-A" })]],
          ["cat-B", [buildGroup({ id: "g-cat-B" })]],
        ]),
      ),
    );
    const listByProductIds = vi.fn((_ids: string[]) =>
      okAsync(
        new Map<string, ModifierGroup[]>([
          ["p1", [buildGroup({ id: "g-prod-p1" })]],
        ]),
      ),
    );
    const repo = { listByCategoryIds, listByProductIds } as unknown as ModifierGroupRepository;

    const result = await listProductModifierGroupsBatch(repo, products);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    const map = result.value;

    // p1 has both cat-A group and p1 group
    expect(map.p1?.map((g) => g.id).sort()).toEqual(["g-cat-A", "g-prod-p1"]);
    // p2 has only cat-B group
    expect(map.p2?.map((g) => g.id)).toEqual(["g-cat-B"]);
  });

  it("deduplicates groupIds when the same group is assigned to both category and product", async () => {
    const products: BatchInput[] = [{ productId: "p1", categoryId: "cat-A" }];

    const sharedGroup = buildGroup({ id: "g-shared" });
    const listByCategoryIds = vi.fn(() =>
      okAsync(new Map<string, ModifierGroup[]>([["cat-A", [sharedGroup]]])),
    );
    const listByProductIds = vi.fn(() =>
      okAsync(new Map<string, ModifierGroup[]>([["p1", [sharedGroup]]])),
    );
    const repo = { listByCategoryIds, listByProductIds } as unknown as ModifierGroupRepository;

    const result = await listProductModifierGroupsBatch(repo, products);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.p1).toHaveLength(1);
    expect(result.value.p1?.[0]?.id).toBe("g-shared");
  });

  it("returns an empty array for a product whose categoryId is missing (not in the map)", async () => {
    const products: BatchInput[] = [{ productId: "p-orphan", categoryId: "cat-deleted" }];

    const listByCategoryIds = vi.fn(() => okAsync(new Map<string, ModifierGroup[]>([])));
    const listByProductIds = vi.fn(() => okAsync(new Map<string, ModifierGroup[]>([])));
    const repo = { listByCategoryIds, listByProductIds } as unknown as ModifierGroupRepository;

    const result = await listProductModifierGroupsBatch(repo, products);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    // p-orphan has no groups because its category was deleted
    expect(result.value["p-orphan"]).toEqual([]);
  });

  it("propagates the error from listByCategoryIds", async () => {
    const listByCategoryIds = vi.fn(() =>
      errAsync(new MenuDomainError("Failed to list category groups")),
    );
    const listByProductIds = vi.fn(() => okAsync(new Map<string, ModifierGroup[]>([])));
    const repo = { listByCategoryIds, listByProductIds } as unknown as ModifierGroupRepository;

    const result = await listProductModifierGroupsBatch(repo, [
      { productId: "p1", categoryId: "cat-A" },
    ]);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("expected error");
    expect(result.error.message).toContain("category");
  });

  it("propagates the error from listByProductIds", async () => {
    const listByCategoryIds = vi.fn(() => okAsync(new Map<string, ModifierGroup[]>([])));
    const listByProductIds = vi.fn(() =>
      errAsync(new MenuDomainError("Failed to list product groups")),
    );
    const repo = { listByCategoryIds, listByProductIds } as unknown as ModifierGroupRepository;

    const result = await listProductModifierGroupsBatch(repo, [
      { productId: "p1", categoryId: "cat-A" },
    ]);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("expected error");
    expect(result.error.message).toContain("product");
  });
});
