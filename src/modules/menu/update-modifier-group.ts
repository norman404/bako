import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "./errors";
import type { ModifierGroup } from "./modifier-group";
import type { ModifierGroupRepository, ModifierGroupUpsertInput } from "./ports";

export function updateModifierGroup(
  repository: ModifierGroupRepository,
  id: string,
  input: ModifierGroupUpsertInput,
): ResultAsync<ModifierGroup, MenuDomainError> {
  return repository.update(id, input);
}