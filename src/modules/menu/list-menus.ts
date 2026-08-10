import type { ResultAsync } from "neverthrow";

import type { Menu } from "./menu";
import type { MenuDomainError } from "./errors";
import type { MenuRepository } from "./ports";

export function listMenus(repository: MenuRepository): ResultAsync<Menu[], MenuDomainError> {
  return repository.list();
}
