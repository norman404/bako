import type { TFunction } from "i18next";

import {
  CheckoutPersistenceError,
  type CheckoutTranslatableError,
} from "@/modules/checkout/domain/errors";

function isCheckoutTranslatableError(error: unknown): error is CheckoutTranslatableError {
  return error instanceof CheckoutPersistenceError;
}

/**
 * Translates a checkout module error into a user-facing string using the active i18n locale.
 *
 * Untranslatable errors fall back to a generic checkout message so the UI never exposes
 * raw English persistence strings to the user.
 */
export function translateCheckoutError(error: unknown, t: TFunction): string {
  if (isCheckoutTranslatableError(error)) {
    return t(`checkout:errors.${error.code}`, error.params ?? {});
  }

  return t("checkout:errors.generic");
}
