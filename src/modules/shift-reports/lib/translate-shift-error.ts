import type { TFunction } from "i18next";

import { ShiftPersistenceError, type ShiftTranslatableError } from "@/modules/shift-reports/domain/errors";

function isShiftTranslatableError(error: unknown): error is ShiftTranslatableError {
  return error instanceof ShiftPersistenceError;
}

/**
 * Translates a shift module error into a user-facing string using the active i18n locale.
 *
 * Untranslatable errors fall back to a generic shift message.
 */
export function translateShiftError(error: unknown, t: TFunction): string {
  if (isShiftTranslatableError(error)) {
    return t(`shift:errors.${error.code}`, error.params ?? {});
  }

  return t("shift:errors.generic");
}
