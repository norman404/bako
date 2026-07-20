import { describe, expect, it, mock } from "bun:test";
import { okAsync } from "neverthrow";

import type { ModifierGroupRepository } from "@/modules/menu/domain/ports";
import { listCategoryAssignments } from "@/modules/menu/use-cases/list-category-assignments";
import { listProductAssignments } from "@/modules/menu/use-cases/list-product-assignments";

describe("listCategoryAssignments", () => {
  it("returns a Set of groupIds assigned to each categoryId", async () => {
    const repo = {
      listCategoryAssignments: mock(() =>
        okAsync(new Map<string, Set<string>>([
          ["cat-bebidas", new Set(["g1", "g2"])],
          ["cat-comidas", new Set(["g1"])],
        ])),
      ),
    } as unknown as ModifierGroupRepository;

    const result = await listCategoryAssignments(repo);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    const map = result.value;
    expect(map.get("cat-bebidas")?.has("g1")).toBe(true);
    expect(map.get("cat-bebidas")?.has("g2")).toBe(true);
    expect(map.get("cat-comidas")?.has("g1")).toBe(true);
    expect(map.get("cat-comidas")?.has("g2")).toBe(false);
  });
});

describe("listProductAssignments", () => {
  it("returns a Set of groupIds assigned to each productId", async () => {
    const repo = {
      listProductAssignments: mock(() =>
        okAsync(new Map<string, Set<string>>([
          ["prod-1", new Set(["g1"])],
          ["prod-2", new Set([])],
        ])),
      ),
    } as unknown as ModifierGroupRepository;

    const result = await listProductAssignments(repo);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    const map = result.value;
    expect(map.get("prod-1")?.has("g1")).toBe(true);
    expect(map.get("prod-2")?.size).toBe(0);
  });
});
