import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "./errors";
import type { ModifierGroupRepository } from "./ports";

export function archiveModifierGroup(
  repository: ModifierGroupRepository,
  id: string,
): ResultAsync<void, MenuDomainError> {
  return repository.archive(id);
}