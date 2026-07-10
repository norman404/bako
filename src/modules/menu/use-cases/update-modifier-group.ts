import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import type { ModifierGroupRepository, ModifierGroupUpsertInput } from "@/modules/menu/domain/ports";

export function updateModifierGroup(
  repository: ModifierGroupRepository,
  id: string,
  input: ModifierGroupUpsertInput,
): ResultAsync<ModifierGroup, MenuDomainError> {
  return repository.update(id, input);
}