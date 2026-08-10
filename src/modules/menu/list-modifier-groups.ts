import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "./errors";
import type { ModifierGroup } from "./modifier-group";
import type { ModifierGroupRepository } from "./ports";

export function listModifierGroups(
  repository: ModifierGroupRepository,
): ResultAsync<ModifierGroup[], MenuDomainError> {
  return repository.list();
}