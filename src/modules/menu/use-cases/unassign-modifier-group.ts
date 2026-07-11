import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierAssignmentInput, ModifierGroupRepository } from "@/modules/menu/domain/ports";

export function unassignModifierGroup(
  repository: ModifierGroupRepository,
  input: ModifierAssignmentInput,
): ResultAsync<void, MenuDomainError> {
  return repository.unassign(input);
}
