import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroupRepository } from "@/modules/menu/domain/ports";

/**
 * Returns a Map<categoryId, Set<groupId>> describing which modifier groups
 * are assigned to which categories.
 */
export function listCategoryAssignments(
  repository: ModifierGroupRepository,
): ResultAsync<Map<string, Set<string>>, MenuDomainError> {
  return repository.listCategoryAssignments();
}
