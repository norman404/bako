import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroupRepository } from "@/modules/menu/domain/ports";

export function archiveModifierGroup(
  repository: ModifierGroupRepository,
  id: string,
): ResultAsync<void, MenuDomainError> {
  return repository.archive(id);
}