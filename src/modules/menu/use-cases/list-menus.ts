import type { ResultAsync } from "neverthrow";

import type { Menu } from "@/modules/menu/domain/menu";
import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { MenuRepository } from "@/modules/menu/domain/ports";

export function listMenus(repository: MenuRepository): ResultAsync<Menu[], MenuDomainError> {
  return repository.list();
}
