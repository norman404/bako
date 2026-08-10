import { and, eq, isNull, ne } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { PrinterNotFoundError, PrinterValidationError, type PrinterDomainError } from "./errors";
import { DEFAULT_LABEL_ORIENTATION, PRINTER_ROLE, type Printer, type PrinterCreateInput, type PrinterUpdateInput } from "./printer";
import type { PrinterRepository } from "./ports";
import { db } from "@/db/client";
import { printers, type PrinterRow } from "@/db/schema";

const DEFAULT_LABEL_WIDTH_MM = 40;
const DEFAULT_LABEL_HEIGHT_MM = 30;
const DEFAULT_LABEL_GAP_MM = 2;
const DEFAULT_LABEL_LANGUAGE = "tspl";
const VALID_LABEL_LANGUAGES = new Set(["tspl", "zpl", "epl", "cpcl"]);

function rowToPrinter(row: PrinterRow): Printer {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Printer["type"],
    address: row.address,
    role: row.role as Printer["role"],
    isDefault: row.isDefault ?? false,
    labelWidthMm: row.labelWidthMm ?? DEFAULT_LABEL_WIDTH_MM,
    labelHeightMm: row.labelHeightMm ?? DEFAULT_LABEL_HEIGHT_MM,
    labelGapMm: row.labelGapMm ?? DEFAULT_LABEL_GAP_MM,
    labelLanguage: (row.labelLanguage ?? DEFAULT_LABEL_LANGUAGE) as Printer["labelLanguage"],
    labelOrientation: (row.labelOrientation ?? DEFAULT_LABEL_ORIENTATION) as Printer["labelOrientation"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function wrapDbError(context: string) {
  return (cause: unknown) =>
    new PrinterValidationError("dbError", { context, cause: String(cause) }, `${context}: ${String(cause)}`);
}

function validatePrinterInput(input: PrinterCreateInput): PrinterDomainError | null {
  if (input.name.trim().length === 0) {
    return new PrinterValidationError("printerNameRequired");
  }

  if (input.address.trim().length === 0) {
    return new PrinterValidationError("printerAddressRequired");
  }

  if (!["usb", "network", "label"].includes(input.type)) {
    return new PrinterValidationError("printerTypeInvalid", { type: input.type }, `Invalid printer type: ${input.type}`);
  }

  if (!Object.values(PRINTER_ROLE).includes(input.role)) {
    return new PrinterValidationError("printerRoleInvalid", { role: input.role }, `Invalid printer role: ${input.role}`);
  }

  if (input.type === "label" && input.labelLanguage !== undefined && !VALID_LABEL_LANGUAGES.has(input.labelLanguage)) {
    return new PrinterValidationError("printerLabelLanguageInvalid", { labelLanguage: input.labelLanguage }, `Invalid label language: ${input.labelLanguage}`);
  }

  if (input.isDefault === true && input.role !== PRINTER_ROLE.RECEIPT) {
    return new PrinterValidationError("printerDefaultRoleInvalid", { role: input.role }, `Default printer must have role 'receipt', got '${input.role}'`);
  }

  return null;
}

async function findActivePrinterRowById(id: string): Promise<PrinterRow | undefined> {
  const rows = await db
    .select()
    .from(printers)
    .where(and(eq(printers.id, id), isNull(printers.deletedAt)))
    .limit(1);

  return rows[0];
}

function loadActivePrinterById(id: string, context: string): ResultAsync<Printer, PrinterDomainError> {
  return ResultAsync.fromPromise(findActivePrinterRowById(id), wrapDbError(context)).andThen((row) => {
    if (!row) {
      return errAsync(new PrinterNotFoundError(id));
    }

    return okAsync(rowToPrinter(row));
  });
}

function unsetOtherReceiptDefaults(excludeId?: string): Promise<unknown> {
  const conditions = [
    eq(printers.role, PRINTER_ROLE.RECEIPT),
    eq(printers.isDefault, true),
    isNull(printers.deletedAt),
  ];

  if (excludeId !== undefined) {
    conditions.push(ne(printers.id, excludeId));
  }

  return db
    .update(printers)
    .set({ isDefault: false })
    .where(and(...conditions));
}

export const printerDrizzleRepository: PrinterRepository = {
  list() {
    return ResultAsync.fromPromise(
      db.select().from(printers).where(isNull(printers.deletedAt)),
      wrapDbError("Failed to list printers"),
    ).map((rows) => rows.map(rowToPrinter));
  },

  findById(id: string) {
    return loadActivePrinterById(id, "Failed to find printer");
  },

  create(input: PrinterCreateInput) {
    const validationError = validatePrinterInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const printerId = crypto.randomUUID();
    const now = new Date();
    const shouldUnsetDefaults = input.isDefault === true;

    const insertPromise = (async () => {
      if (shouldUnsetDefaults) {
        await unsetOtherReceiptDefaults();
      }

      const rows = await db
        .insert(printers)
        .values({
          id: printerId,
          name: input.name.trim(),
          type: input.type,
          address: input.address.trim(),
          role: input.role,
          isDefault: input.isDefault ?? false,
          labelWidthMm: input.labelWidthMm ?? DEFAULT_LABEL_WIDTH_MM,
          labelHeightMm: input.labelHeightMm ?? DEFAULT_LABEL_HEIGHT_MM,
          labelGapMm: input.labelGapMm ?? DEFAULT_LABEL_GAP_MM,
          labelLanguage: input.labelLanguage ?? DEFAULT_LABEL_LANGUAGE,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return rows;
    })();

    return ResultAsync.fromPromise(insertPromise, wrapDbError("Failed to create printer")).andThen((rows) => {
      const [createdPrinter] = rows;
      if (!createdPrinter) {
        return errAsync(new PrinterValidationError("dbError", { context: "Failed to load created printer" }));
      }

      return okAsync(rowToPrinter(createdPrinter));
    });
  },

  update(id: string, input: PrinterUpdateInput) {
    const validationError = validatePrinterInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const now = new Date();
    const shouldUnsetDefaults = input.isDefault === true;

    const updatePromise = loadActivePrinterById(id, "Failed to find printer")
      .andThen(() =>
        ResultAsync.fromPromise(
          (async () => {
            if (shouldUnsetDefaults) {
              await unsetOtherReceiptDefaults(id);
            }

            const rows = await db
              .update(printers)
              .set({
                name: input.name.trim(),
                type: input.type,
                address: input.address.trim(),
                role: input.role,
                isDefault: input.isDefault ?? false,
                labelWidthMm: input.labelWidthMm ?? DEFAULT_LABEL_WIDTH_MM,
                labelHeightMm: input.labelHeightMm ?? DEFAULT_LABEL_HEIGHT_MM,
                labelGapMm: input.labelGapMm ?? DEFAULT_LABEL_GAP_MM,
                labelLanguage: input.labelLanguage ?? DEFAULT_LABEL_LANGUAGE,
                updatedAt: now,
              })
              .where(and(eq(printers.id, id), isNull(printers.deletedAt)))
              .returning();

            return rows;
          })(),
          wrapDbError("Failed to update printer"),
        ),
      )
      .andThen((rows) => {
        const [updatedPrinter] = rows;
        if (!updatedPrinter) {
          return errAsync(new PrinterNotFoundError(id));
        }

        return okAsync(rowToPrinter(updatedPrinter));
      });

    return updatePromise;
  },

  archive(id: string) {
    const now = new Date();

    return loadActivePrinterById(id, "Failed to find printer")
      .andThen(() =>
        ResultAsync.fromPromise(
          db
            .update(printers)
            .set({
              deletedAt: now,
              updatedAt: now,
            })
            .where(and(eq(printers.id, id), isNull(printers.deletedAt)))
            .returning({ id: printers.id }),
          wrapDbError("Failed to archive printer"),
        ),
      )
      .andThen((rows) => {
        if (rows.length === 0) {
          return errAsync(new PrinterNotFoundError(id));
        }

        return okAsync(undefined);
      });
  },
};
