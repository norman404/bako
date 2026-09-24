import { and, eq, inArray, isNull } from "drizzle-orm";
import { errAsync, ResultAsync } from "neverthrow";

import { parseWeeklySchedule } from "@/lib/weekly-schedule";
import { db, withTransaction, type DatabaseClient } from "@/db/client";
import { promotions, promotionTargets, type PromotionRow, type PromotionTargetRow } from "@/db/schema";

import {
  PROMOTION_ERROR_CODE,
  PromotionError,
  normalizePromotionInput,
  validatePromotionInput,
  type PromotionInput,
} from "./promotion-form";
import { PROMOTION_TYPE, type Promotion, type PromotionType } from "./types";

function wrapDbError(context: string) {
  return (cause: unknown) =>
    cause instanceof PromotionError ? cause : new PromotionError(PROMOTION_ERROR_CODE.DB_ERROR, `${context}: ${String(cause)}`);
}

function toPromotionType(value: string): PromotionType {
  return value === PROMOTION_TYPE.BUNDLE ? PROMOTION_TYPE.BUNDLE : PROMOTION_TYPE.NXM;
}

// A row whose stored schedule no longer parses is skipped instead of crashing the register:
// an unreadable promotion must never be applied.
function rowToPromotion(row: PromotionRow, targetRows: PromotionTargetRow[]): Promotion | null {
  const schedule = parseWeeklySchedule(row.schedule);
  if (!schedule) return null;

  return {
    id: row.id,
    name: row.name,
    type: toPromotionType(row.type),
    buyQuantity: row.buyQuantity,
    payQuantity: row.payQuantity,
    bundlePrice: row.bundlePrice,
    schedule,
    isActive: row.isActive,
    targets: targetRows.map((target) => ({
      productId: target.productId,
      categoryId: target.categoryId,
      quantity: target.quantity,
    })),
  };
}

async function replaceTargets(tx: DatabaseClient, promotionId: string, input: PromotionInput): Promise<void> {
  await tx.delete(promotionTargets).where(eq(promotionTargets.promotionId, promotionId));
  await tx.insert(promotionTargets).values(
    input.targets.map((target) => ({
      id: crypto.randomUUID(),
      promotionId,
      productId: target.productId,
      categoryId: target.categoryId,
      quantity: target.quantity,
    })),
  );
}

function prepareInput(input: PromotionInput): PromotionInput | PromotionError {
  const normalized = normalizePromotionInput(input);
  const errorCode = validatePromotionInput(normalized);
  return errorCode ? new PromotionError(errorCode) : normalized;
}

export const promotionRepository = {
  list(): ResultAsync<Promotion[], PromotionError> {
    return ResultAsync.fromPromise(
      (async () => {
        const rows = await db.select().from(promotions).where(isNull(promotions.deletedAt));
        if (rows.length === 0) return [];

        const targetRows = await db
          .select()
          .from(promotionTargets)
          .where(inArray(promotionTargets.promotionId, rows.map((row) => row.id)));

        return rows
          .map((row) => rowToPromotion(row, targetRows.filter((target) => target.promotionId === row.id)))
          .filter((promotion): promotion is Promotion => promotion !== null)
          .sort((a, b) => a.name.localeCompare(b.name));
      })(),
      wrapDbError("Failed to list promotions"),
    );
  },

  create(input: PromotionInput): ResultAsync<string, PromotionError> {
    const prepared = prepareInput(input);
    if (prepared instanceof PromotionError) return errAsync(prepared);

    return ResultAsync.fromPromise(
      withTransaction(async (tx) => {
        const id = crypto.randomUUID();
        const now = new Date();
        await tx.insert(promotions).values({
          id,
          name: prepared.name,
          type: prepared.type,
          buyQuantity: prepared.buyQuantity,
          payQuantity: prepared.payQuantity,
          bundlePrice: prepared.bundlePrice,
          schedule: prepared.schedule,
          isActive: prepared.isActive,
          createdAt: now,
          updatedAt: now,
        });
        await replaceTargets(tx, id, prepared);
        return id;
      }),
      wrapDbError("Failed to create promotion"),
    );
  },

  update(id: string, input: PromotionInput): ResultAsync<void, PromotionError> {
    const prepared = prepareInput(input);
    if (prepared instanceof PromotionError) return errAsync(prepared);

    return ResultAsync.fromPromise(
      withTransaction(async (tx) => {
        const updated = await tx
          .update(promotions)
          .set({
            name: prepared.name,
            type: prepared.type,
            buyQuantity: prepared.buyQuantity,
            payQuantity: prepared.payQuantity,
            bundlePrice: prepared.bundlePrice,
            schedule: prepared.schedule,
            isActive: prepared.isActive,
            updatedAt: new Date(),
          })
          .where(and(eq(promotions.id, id), isNull(promotions.deletedAt)))
          .returning({ id: promotions.id });
        if (updated.length === 0) throw new PromotionError(PROMOTION_ERROR_CODE.NOT_FOUND);
        await replaceTargets(tx, id, prepared);
      }),
      wrapDbError("Failed to update promotion"),
    );
  },

  setActive(id: string, isActive: boolean): ResultAsync<void, PromotionError> {
    return ResultAsync.fromPromise(
      db.update(promotions).set({ isActive, updatedAt: new Date() }).where(eq(promotions.id, id)),
      wrapDbError("Failed to toggle promotion"),
    ).map(() => undefined);
  },

  // Soft delete: past sales keep their promotion id pointing at a row that still exists.
  archive(id: string): ResultAsync<void, PromotionError> {
    const now = new Date();
    return ResultAsync.fromPromise(
      db.update(promotions).set({ deletedAt: now, isActive: false, updatedAt: now }).where(eq(promotions.id, id)),
      wrapDbError("Failed to archive promotion"),
    ).map(() => undefined);
  },
};
