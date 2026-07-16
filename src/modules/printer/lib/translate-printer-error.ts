import type { TFunction } from "i18next";

import { PrinterDomainError, type PrinterTranslatableError } from "@/modules/printer/domain/errors";

function isPrinterTranslatableError(error: unknown): error is PrinterTranslatableError {
  return error instanceof PrinterDomainError;
}

/**
 * Translates a printer module error into a user-facing string using the active i18n locale.
 *
 * Untranslatable errors fall back to a generic printer message.
 */
export function translatePrinterError(error: unknown, t: TFunction): string {
  if (isPrinterTranslatableError(error)) {
    return t(`errors:printer.${error.code}`, error.params ?? {});
  }

  return t("errors:printer.generic");
}
