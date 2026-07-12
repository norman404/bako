import { and, eq, isNull } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { PrinterNotFoundError, PrinterValidationError, type PrinterDomainError } from "@/modules/printer/domain/errors";
import type { Printer, PrinterCreateInput, PrinterUpdateInput } from "@/modules/printer/domain/printer";
import type { PrinterRepository } from "@/modules/printer/domain/ports";
import { db } from "@/shared/db/client";
import { printers, type PrinterRow } from "@/shared/db/schema";

function rowToPrinter(row: PrinterRow): Printer {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Printer["type"],
    address: row.address,
    role: row.role as Printer["role"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function wrapDbError(context: string) {
  return (cause: unknown) => new PrinterValidationError(`${context}: ${String(cause)}`);
}

function validatePrinterInput(input: PrinterCreateInput): PrinterDomainError | null {
  if (input.name.trim().length === 0) {
    return new PrinterValidationError("Printer name is required");
  }

  if (input.address.trim().length === 0) {
    return new PrinterValidationError("Printer address is required");
  }

  if (!["usb", "network"].includes(input.type)) {
    return new PrinterValidationError(`Invalid printer type: ${input.type}`);
  }

  if (!["receipt", "kitchen", "bar", "other"].includes(input.role)) {
    return new PrinterValidationError(`Invalid printer role: ${input.role}`);
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

    return ResultAsync.fromPromise(
      db
        .insert(printers)
        .values({
          id: printerId,
          name: input.name.trim(),
          type: input.type,
          address: input.address.trim(),
          role: input.role,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      wrapDbError("Failed to create printer"),
    ).andThen((rows) => {
      const [createdPrinter] = rows;
      if (!createdPrinter) {
        return errAsync(new PrinterValidationError("Failed to load created printer"));
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

    return loadActivePrinterById(id, "Failed to find printer").andThen(() =>
      ResultAsync.fromPromise(
        db
          .update(printers)
          .set({
            name: input.name.trim(),
            type: input.type,
            address: input.address.trim(),
            role: input.role,
            updatedAt: now,
          })
          .where(and(eq(printers.id, id), isNull(printers.deletedAt)))
          .returning(),
        wrapDbError("Failed to update printer"),
      ),
    ).andThen((rows) => {
      const [updatedPrinter] = rows;
      if (!updatedPrinter) {
        return errAsync(new PrinterNotFoundError(id));
      }

      return okAsync(rowToPrinter(updatedPrinter));
    });
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
