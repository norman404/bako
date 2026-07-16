import type { TFunction } from "i18next";

import { MenuDomainError, type MenuTranslatableError } from "@/modules/menu/domain/errors";

function isMenuTranslatableError(error: unknown): error is MenuTranslatableError {
  return error instanceof MenuDomainError && "code" in error && typeof error.code === "string";
}

/**
 * Translates a menu module error into a user-facing string using the active i18n locale.
 *
 * Untranslatable errors (generic MenuDomainError, native Error, or non-error values)
 * fall back to a generic menu error key so the UI never exposes raw English messages
 * from the persistence layer.
 */
export function translateMenuError(
  error: unknown,
  t: TFunction,
): string {
  if (isMenuTranslatableError(error)) {
    return t(`errors:menu.${error.code}`, error.params ?? {});
  }

  return t("errors:menu.generic");
}
