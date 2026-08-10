import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "./errors";
import type { ModifierGroup } from "./modifier-group";
import type { ModifierGroupRepository, ModifierGroupUpsertInput } from "./ports";

export function createModifierGroup(
  repository: ModifierGroupRepository,
  input: ModifierGroupUpsertInput,
): ResultAsync<ModifierGroup, MenuDomainError> {
  return repository.create(input);
}