import type { ResultAsync } from "neverthrow";

import type { Category } from "./category";
import type { MenuDomainError } from "./errors";
import type { CategoryRepository } from "./ports";

export function listCategories(
  repository: CategoryRepository,
  menuId?: string,
): ResultAsync<Category[], MenuDomainError> {
  return repository.list(menuId);
}
