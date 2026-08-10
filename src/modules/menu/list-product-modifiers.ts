import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "./errors";
import type { ModifierGroup } from "./modifier-group";
import { resolveProductModifierGroups } from "./modifier-group";
import type { ModifierGroupRepository } from "./ports";

export function listProductModifiers(
  repository: ModifierGroupRepository,
  categoryId: string,
  productId: string,
): ResultAsync<ModifierGroup[], MenuDomainError> {
  return repository
    .listByCategory(categoryId)
    .andThen((categoryGroups) =>
      repository.listByProduct(productId).map((productGroups) =>
        resolveProductModifierGroups(categoryGroups, productGroups),
      ),
    );
}