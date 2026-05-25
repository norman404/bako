import type { ResultAsync } from "neverthrow";

import type { Category } from "@/modules/menu/domain/category";
import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { CategoryCreateInput, CategoryRepository } from "@/modules/menu/domain/ports";

export function createCategory(
  repository: CategoryRepository,
  input: CategoryCreateInput,
): ResultAsync<Category, MenuDomainError> {
  return repository.create(input);
}
