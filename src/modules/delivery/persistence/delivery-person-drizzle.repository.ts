import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import type { DeliveryPerson, DeliveryPersonCutRow } from "@/modules/delivery/domain/delivery-person";
import { DeliveryPersonError, DeliveryPersonNotFoundError } from "@/modules/delivery/domain/errors";
import type { DeliveryPersonCreateInput, DeliveryPersonRepository } from "@/modules/delivery/domain/ports";
import { db } from "@/shared/db/client";
import { deliveryPersons, orders, type DeliveryPersonRow } from "@/shared/db/schema";

function rowToDeliveryPerson(row: DeliveryPersonRow): DeliveryPerson {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    phone: row.phone ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

function wrapDbError(context: string) {
  return (cause: unknown) => new DeliveryPersonError(`${context}: ${String(cause)}`);
}

function validateInput(input: DeliveryPersonCreateInput): DeliveryPersonError | null {
  if (input.name.trim().length === 0) {
    return new DeliveryPersonError("Delivery person name is required");
  }

  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(input.color)) {
    return new DeliveryPersonError("Delivery person color must be a valid hex color (e.g. #FFF or #FF5733)");
  }

  return null;
}

function normalizeInput(input: DeliveryPersonCreateInput): DeliveryPersonCreateInput {
  return {
    name: input.name.trim(),
    color: input.color.trim(),
    phone: input.phone?.trim() || null,
  };
}

async function findActiveDeliveryPersonRowById(id: string): Promise<DeliveryPersonRow | undefined> {
  const rows = await db
    .select()
    .from(deliveryPersons)
    .where(and(eq(deliveryPersons.id, id), isNull(deliveryPersons.deletedAt)))
    .limit(1);

  return rows[0];
}

function loadActiveDeliveryPersonRowById(
  id: string,
  context: string,
): ResultAsync<DeliveryPersonRow, DeliveryPersonError> {
  return ResultAsync.fromPromise(findActiveDeliveryPersonRowById(id), wrapDbError(context)).andThen((row) => {
    if (!row) {
      return errAsync(new DeliveryPersonNotFoundError(id));
    }

    return okAsync(row);
  });
}

function loadActiveDeliveryPersonById(
  id: string,
  context: string,
): ResultAsync<DeliveryPerson, DeliveryPersonError> {
  return loadActiveDeliveryPersonRowById(id, context).map(rowToDeliveryPerson);
}

export const deliveryPersonDrizzleRepository: DeliveryPersonRepository = {
  list() {
    return ResultAsync.fromPromise(
      db.select().from(deliveryPersons).where(isNull(deliveryPersons.deletedAt)),
      wrapDbError("Failed to list delivery persons"),
    ).map((rows) => rows.map(rowToDeliveryPerson));
  },

  findById(id: string) {
    return loadActiveDeliveryPersonById(id, "Failed to find delivery person");
  },

  create(input: DeliveryPersonCreateInput) {
    const validationError = validateInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeInput(input);
    const deliveryPersonId = crypto.randomUUID();
    const now = new Date();

    return ResultAsync.fromPromise(
      db
        .insert(deliveryPersons)
        .values({
          id: deliveryPersonId,
          name: normalizedInput.name,
          color: normalizedInput.color,
          phone: normalizedInput.phone ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
      wrapDbError("Failed to create delivery person"),
    ).andThen((rows) => {
      const [created] = rows;
      if (!created) {
        return errAsync(new DeliveryPersonError("Failed to load created delivery person"));
      }

      return okAsync(rowToDeliveryPerson(created));
    });
  },

  update(id: string, input: DeliveryPersonCreateInput) {
    const validationError = validateInput(input);
    if (validationError) {
      return errAsync(validationError);
    }

    const normalizedInput = normalizeInput(input);
    const now = new Date();

    return loadActiveDeliveryPersonRowById(id, "Failed to find delivery person").andThen(() =>
      ResultAsync.fromPromise(
        db
          .update(deliveryPersons)
          .set({
            name: normalizedInput.name,
            color: normalizedInput.color,
            phone: normalizedInput.phone ?? null,
            updatedAt: now,
          })
          .where(and(eq(deliveryPersons.id, id), isNull(deliveryPersons.deletedAt)))
          .returning(),
        wrapDbError("Failed to update delivery person"),
      ),
    ).andThen((rows) => {
      const [updated] = rows;
      if (!updated) {
        return errAsync(new DeliveryPersonNotFoundError(id));
      }

      return okAsync(rowToDeliveryPerson(updated));
    });
  },

  archive(id: string) {
    const now = new Date();

    return loadActiveDeliveryPersonRowById(id, "Failed to find delivery person")
      .andThen(() =>
        ResultAsync.fromPromise(
          db
            .update(deliveryPersons)
            .set({
              deletedAt: now,
              updatedAt: now,
            })
            .where(and(eq(deliveryPersons.id, id), isNull(deliveryPersons.deletedAt)))
            .returning({ id: deliveryPersons.id }),
          wrapDbError("Failed to archive delivery person"),
        ),
      )
      .andThen((rows) => {
        if (rows.length === 0) {
          return errAsync(new DeliveryPersonNotFoundError(id));
        }

        return okAsync(undefined);
      });
  },

  getTodayCut() {
    return ResultAsync.fromPromise(
      (async () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

        const rows = await db
          .select({
            deliveryPersonId: deliveryPersons.id,
            name: deliveryPersons.name,
            color: deliveryPersons.color,
            ordersCount: sql<number>`count(${orders.id})`,
            totalSales: sql<number>`coalesce(sum(${orders.total}), 0)`,
          })
          .from(orders)
          .innerJoin(deliveryPersons, eq(orders.deliveryPersonId, deliveryPersons.id))
          .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)))
          .groupBy(deliveryPersons.id);

        const cutRows: DeliveryPersonCutRow[] = rows.map((row) => ({
          deliveryPersonId: row.deliveryPersonId,
          name: row.name,
          color: row.color,
          ordersCount: Number(row.ordersCount),
          totalSales: Number(row.totalSales),
        }));

        const totalOrders = cutRows.reduce((sum, row) => sum + row.ordersCount, 0);
        const totalSales = cutRows.reduce((sum, row) => sum + row.totalSales, 0);

        return { rows: cutRows, totalOrders, totalSales, generatedAt: new Date() };
      })(),
      wrapDbError("Failed to get today delivery cut"),
    );
  },
};
