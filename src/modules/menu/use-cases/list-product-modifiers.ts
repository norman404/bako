import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import { resolveProductModifierGroups } from "@/modules/menu/domain/modifier-group";
import type { ModifierGroupRepository } from "@/modules/menu/domain/ports";

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