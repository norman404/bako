import type { ResultAsync } from "neverthrow";
import { okAsync } from "neverthrow";

import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import { resolveProductModifierGroups } from "@/modules/menu/domain/modifier-group";
import type { ModifierGroupRepository } from "@/modules/menu/domain/ports";

export interface BatchInput {
  productId: string;
  categoryId: string;
}

/**
 * Returns a `Record<productId, ModifierGroup[]>` describing the effective
 * modifier groups for each product (category assignments ∪ product assignments,
 * deduplicated). Issues at most 2 SQL queries regardless of `inputs.length`.
 *
 * Use this instead of N+1 `listProductModifiers` calls when rendering a
 * product grid: the cost stays O(1) no matter how many products are visible.
 */
export function listProductModifierGroupsBatch(
  repository: ModifierGroupRepository,
  inputs: BatchInput[],
): ResultAsync<Record<string, ModifierGroup[]>, MenuDomainError> {
  if (inputs.length === 0) {
    return okAsync({});
  }

  // Dedupe to avoid redundant work when many products share a category.
  const uniqueCategoryIds = Array.from(new Set(inputs.map((i) => i.categoryId)));
  const uniqueProductIds = Array.from(new Set(inputs.map((i) => i.productId)));

  return repository
    .listByCategoryIds(uniqueCategoryIds)
    .andThen((groupsByCategory) =>
      repository
        .listByProductIds(uniqueProductIds)
        .map((groupsByProduct) => {
          const out: Record<string, ModifierGroup[]> = {};
          for (const { productId, categoryId } of inputs) {
            const categoryGroups = groupsByCategory.get(categoryId) ?? [];
            const productGroups = groupsByProduct.get(productId) ?? [];
            out[productId] = resolveProductModifierGroups(categoryGroups, productGroups);
          }
          return out;
        }),
    );
}
