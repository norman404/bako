import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import type { ModifierGroupRepository } from "@/modules/menu/domain/ports";

export function listModifierGroups(
  repository: ModifierGroupRepository,
): ResultAsync<ModifierGroup[], MenuDomainError> {
  return repository.list();
}