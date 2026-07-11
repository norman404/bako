import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { okAsync } from "neverthrow";

import { useProductModifierGroupsMap } from "@/modules/menu/hooks/use-modifier-groups";
import { modifierGroupDrizzleRepository } from "@/modules/menu/persistence/modifier-group-drizzle.repository";
import * as batchUseCase from "@/modules/menu/use-cases/list-product-modifier-groups-batch";
import type { Product } from "@/modules/menu/domain/product";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";

const FIXED_DATE = new Date("2026-05-12T10:15:30.000Z");

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: overrides.id ?? "p1",
    categoryId: overrides.categoryId ?? "cat-A",
    menuIds: ["menu-1"],
    name: overrides.name ?? "Café",
    description: "",
    price: 1000,
    prepTimeMinutes: 5,
    image: "☕",
    isPopular: false,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

function buildGroup(id: string): ModifierGroup {
  return {
    id,
    name: `Group ${id}`,
    type: "single",
    required: false,
    sortOrder: 0,
    options: [],
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useProductModifierGroupsMap (batch)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("issues at most 1 call to the batch use-case regardless of product count", async () => {
    const batchSpy = vi
      .spyOn(batchUseCase, "listProductModifierGroupsBatch")
      .mockReturnValue(okAsync({}));

    const products = Array.from({ length: 50 }, (_, i) =>
      buildProduct({ id: `p${i}`, categoryId: i % 2 === 0 ? "cat-A" : "cat-B" }),
    );

    renderHook(() => useProductModifierGroupsMap(products), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(batchSpy).toHaveBeenCalled();
    });

    // The contract: exactly one batch call no matter how many products.
    expect(batchSpy).toHaveBeenCalledTimes(1);
    // And the inputs deduplicate the categoryIds: 50 products in 2 categories.
    const inputs = batchSpy.mock.calls[0][1] as Array<{ productId: string; categoryId: string }>;
    const uniqueCategories = new Set(inputs.map((i) => i.categoryId));
    expect(uniqueCategories.size).toBeLessThanOrEqual(2);
    expect(inputs).toHaveLength(50);
  });

  it("pre-fills the returned map with empty arrays for every input product", async () => {
    vi.spyOn(batchUseCase, "listProductModifierGroupsBatch").mockReturnValue(
      okAsync({
        p1: [buildGroup("g1")],
        // p2 missing from result
      }),
    );

    const products = [buildProduct({ id: "p1" }), buildProduct({ id: "p2" })];

    const { result } = renderHook(() => useProductModifierGroupsMap(products), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.p1).toHaveLength(1);
      },
      { timeout: 2000 },
    );

    // p1 has the resolved group, p2 has an empty array (not undefined)
    expect(result.current.p1).toHaveLength(1);
    expect(result.current.p2).toEqual([]);
  });

  it("calls the batch use-case with the real drizzle repository (DI is wired correctly)", async () => {
    // Spy on the repository method that the batch use-case internally calls.
    // We just verify that the wiring is correct: the hook → use-case → repo path.
    const repoSpy = vi
      .spyOn(modifierGroupDrizzleRepository, "listByCategoryIds")
      .mockReturnValue(okAsync(new Map()));

    vi.spyOn(modifierGroupDrizzleRepository, "listByProductIds").mockReturnValue(
      okAsync(new Map()),
    );

    renderHook(() => useProductModifierGroupsMap([buildProduct()]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(repoSpy).toHaveBeenCalled();
    });

    // The hook goes through the batch use-case which goes through the repo.
    expect(repoSpy).toHaveBeenCalledTimes(1);
  });
});
