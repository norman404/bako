import type { ResultAsync } from "neverthrow";

import type { Category } from "./category";
import type { MenuDomainError } from "./errors";
import type { CategoryCreateInput, CategoryRepository } from "./ports";

export function createCategory(
  repository: CategoryRepository,
  input: CategoryCreateInput,
): ResultAsync<Category, MenuDomainError> {
  return repository.create(input);
}
