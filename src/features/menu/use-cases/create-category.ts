import type { ResultAsync } from "neverthrow";

import type { Category } from "@/features/menu/domain/category";
import type { MenuDomainError } from "@/features/menu/domain/errors";
import type { CategoryCreateInput, CategoryRepository } from "@/features/menu/domain/ports";

export function createCategory(
  repository: CategoryRepository,
  input: CategoryCreateInput,
): ResultAsync<Category, MenuDomainError> {
  return repository.create(input);
}
