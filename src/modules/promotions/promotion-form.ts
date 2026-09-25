import { parseWeeklySchedule } from "@/lib/weekly-schedule";

import { PROMOTION_TYPE, type Promotion, type PromotionTarget } from "./types";

export type PromotionInput = Omit<Promotion, "id">;

export const PROMOTION_ERROR_CODE = {
  NAME_REQUIRED: "nameRequired",
  TARGETS_REQUIRED: "targetsRequired",
  TARGET_INVALID: "targetInvalid",
  QUANTITIES_INVALID: "quantitiesInvalid",
  BUNDLE_PRICE_INVALID: "bundlePriceInvalid",
  BUNDLE_TOO_SMALL: "bundleTooSmall",
  SCHEDULE_INVALID: "scheduleInvalid",
  NOT_FOUND: "notFound",
  DB_ERROR: "dbError",
} as const;

export type PromotionErrorCode = (typeof PROMOTION_ERROR_CODE)[keyof typeof PROMOTION_ERROR_CODE];

export class PromotionError extends Error {
  readonly code: PromotionErrorCode;

  constructor(code: PromotionErrorCode, message?: string) {
    super(message ?? code);
    this.name = "PromotionError";
    this.code = code;
  }
}

function isValidTarget(target: PromotionTarget): boolean {
  const hasProduct = target.productId !== null && target.productId.length > 0;
  const hasCategory = target.categoryId !== null && target.categoryId.length > 0;
  return hasProduct !== hasCategory && Number.isInteger(target.quantity) && target.quantity >= 1;
}

export function normalizePromotionInput(input: PromotionInput): PromotionInput {
  const isNxm = input.type === PROMOTION_TYPE.NXM;
  return {
    name: input.name.trim(),
    type: input.type,
    buyQuantity: isNxm ? input.buyQuantity : null,
    payQuantity: isNxm ? input.payQuantity : null,
    bundlePrice: isNxm ? null : input.bundlePrice,
    schedule: input.schedule,
    isActive: input.isActive,
    // An NxM counts units across all its targets, so per-target quantities only matter in bundles.
    targets: input.targets.map((target) => ({
      productId: target.productId || null,
      categoryId: target.categoryId || null,
      quantity: isNxm ? 1 : target.quantity,
    })),
  };
}

export function validatePromotionInput(input: PromotionInput): PromotionErrorCode | null {
  if (input.name.length === 0) return PROMOTION_ERROR_CODE.NAME_REQUIRED;
  if (input.targets.length === 0) return PROMOTION_ERROR_CODE.TARGETS_REQUIRED;
  if (!input.targets.every(isValidTarget)) return PROMOTION_ERROR_CODE.TARGET_INVALID;
  if (!parseWeeklySchedule(input.schedule)) return PROMOTION_ERROR_CODE.SCHEDULE_INVALID;

  if (input.type === PROMOTION_TYPE.NXM) {
    const { buyQuantity, payQuantity } = input;
    if (
      buyQuantity === null ||
      payQuantity === null ||
      !Number.isInteger(buyQuantity) ||
      !Number.isInteger(payQuantity) ||
      buyQuantity < 2 ||
      payQuantity < 1 ||
      payQuantity >= buyQuantity
    ) {
      return PROMOTION_ERROR_CODE.QUANTITIES_INVALID;
    }
    return null;
  }

  if (input.bundlePrice === null || !Number.isInteger(input.bundlePrice) || input.bundlePrice < 0) {
    return PROMOTION_ERROR_CODE.BUNDLE_PRICE_INVALID;
  }
  const bundleUnits = input.targets.reduce((sum, target) => sum + target.quantity, 0);
  if (bundleUnits < 2) return PROMOTION_ERROR_CODE.BUNDLE_TOO_SMALL;

  return null;
}
