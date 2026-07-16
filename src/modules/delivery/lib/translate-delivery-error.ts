import type { TFunction } from "i18next";

import {
  DeliveryPersonError,
  type DeliveryTranslatableError,
} from "@/modules/delivery/domain/errors";

function isDeliveryTranslatableError(error: unknown): error is DeliveryTranslatableError {
  return error instanceof DeliveryPersonError;
}

/**
 * Translates a delivery module error into a user-facing string using the active i18n locale.
 *
 * Untranslatable errors fall back to a generic delivery message.
 */
export function translateDeliveryError(error: unknown, t: TFunction): string {
  if (isDeliveryTranslatableError(error)) {
    return t(`delivery:errors.${error.code}`, error.params ?? {});
  }

  return t("delivery:errors.generic");
}
