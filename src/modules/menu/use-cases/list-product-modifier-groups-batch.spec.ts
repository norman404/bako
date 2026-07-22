import { describe, expect, it, mock } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "@/modules/menu/domain/errors";
import type {
  ModifierGroupRepository,
} from "@/modules/menu/domain/ports";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import { listProductModifierGroupsBatch } from "@/modules/menu/use-cases/list-product-modifier-groups-batch";
import { buildModifierGroup } from "@/modules/menu/test/factories";

interface BatchInput {
  productId: string;
  categoryId: string;
}

describe("listProductModifierGroupsBatch", () => {
  it("returns an empty map for an empty product list (no queries are issued)", async () => {
    const listByCategoryIds = mock();
    const listByProductIds = mock();
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

    const listByCategoryIds = mock((_ids: string[]) =>
      okAsync(new Map([["cat-A", [buildModifierGroup({ id: "g-cat" })]]])),
    );
    const listByProductIds = mock((_ids: string[]) => okAsync(new Map<string, ModifierGroup[]>([])));
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

    const listByCategoryIds = mock((_ids: string[]) =>
      okAsync(
        new Map<string, ModifierGroup[]>([
          ["cat-A", [buildModifierGroup({ id: "g-cat-A" })]],
          ["cat-B", [buildModifierGroup({ id: "g-cat-B" })]],
        ]),
      ),
    );
    const listByProductIds = mock((_ids: string[]) =>
      okAsync(
        new Map<string, ModifierGroup[]>([
          ["p1", [buildModifierGroup({ id: "g-prod-p1" })]],
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

    const sharedGroup = buildModifierGroup({ id: "g-shared" });
    const listByCategoryIds = mock(() =>
      okAsync(new Map<string, ModifierGroup[]>([["cat-A", [sharedGroup]]])),
    );
    const listByProductIds = mock(() =>
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

    const listByCategoryIds = mock(() => okAsync(new Map<string, ModifierGroup[]>([])));
    const listByProductIds = mock(() => okAsync(new Map<string, ModifierGroup[]>([])));
    const repo = { listByCategoryIds, listByProductIds } as unknown as ModifierGroupRepository;

    const result = await listProductModifierGroupsBatch(repo, products);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    // p-orphan has no groups because its category was deleted
    expect(result.value["p-orphan"]).toEqual([]);
  });

  it("propagates the error from listByCategoryIds", async () => {
    const listByCategoryIds = mock(() =>
      errAsync(new MenuDomainError("Failed to list category groups")),
    );
    const listByProductIds = mock(() => okAsync(new Map<string, ModifierGroup[]>([])));
    const repo = { listByCategoryIds, listByProductIds } as unknown as ModifierGroupRepository;

    const result = await listProductModifierGroupsBatch(repo, [
      { productId: "p1", categoryId: "cat-A" },
    ]);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("expected error");
    expect(result.error.message).toContain("category");
  });

  it("propagates the error from listByProductIds", async () => {
    const listByCategoryIds = mock(() => okAsync(new Map<string, ModifierGroup[]>([])));
    const listByProductIds = mock(() =>
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
