import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "./errors";
import type { ModifierAssignmentInput, ModifierGroupRepository } from "./ports";

export function unassignModifierGroup(
  repository: ModifierGroupRepository,
  input: ModifierAssignmentInput,
): ResultAsync<void, MenuDomainError> {
  return repository.unassign(input);
}
