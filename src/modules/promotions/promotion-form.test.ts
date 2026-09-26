import { describe, expect, it } from "vitest";

import { PROMOTION_ERROR_CODE, normalizePromotionInput, validatePromotionInput, type PromotionInput } from "./promotion-form";
import { PROMOTION_TYPE } from "./types";

const VALID_NXM: PromotionInput = {
  name: " 2x1 Latte ",
  type: PROMOTION_TYPE.NXM,
  buyQuantity: 2,
  payQuantity: 1,
  bundlePrice: 5_000,
  schedule: { windows: [{ days: [1], startMinute: 840, endMinute: 1080 }], validFrom: null, validUntil: null },
  isActive: true,
  targets: [{ productId: "latte", categoryId: null, quantity: 3 }],
};

describe("promotion form", () => {
  // CASE: A manager saves a 2x1 after switching the form from bundle to NxM.
  // VALIDATES: Leftover fields from the other type are dropped so the row passes the database checks.
  it("should keep only the fields of the selected promotion type", () => {
    // Arrange
    const input = VALID_NXM;

    // Act
    const normalized = normalizePromotionInput(input);

    // Assert
    expect(normalized).toMatchObject({ name: "2x1 Latte", bundlePrice: null, targets: [{ quantity: 1 }] });
    expect(validatePromotionInput(normalized)).toBeNull();
  });

  // CASE: A manager submits incomplete or contradictory promotions.
  // VALIDATES: Each problem maps to a specific, translatable error instead of a database failure.
  it("should reject incomplete or contradictory promotions", () => {
    // Arrange
    const bundle = { ...VALID_NXM, type: PROMOTION_TYPE.BUNDLE, buyQuantity: null, payQuantity: null };
    const cases: Array<[PromotionInput, string]> = [
      [{ ...VALID_NXM, name: "   " }, PROMOTION_ERROR_CODE.NAME_REQUIRED],
      [{ ...VALID_NXM, targets: [] }, PROMOTION_ERROR_CODE.TARGETS_REQUIRED],
      [{ ...VALID_NXM, payQuantity: 2 }, PROMOTION_ERROR_CODE.QUANTITIES_INVALID],
      [{ ...VALID_NXM, schedule: { ...VALID_NXM.schedule, windows: [] } }, PROMOTION_ERROR_CODE.SCHEDULE_INVALID],
      [{ ...bundle, targets: [{ productId: "latte", categoryId: null, quantity: 1 }] }, PROMOTION_ERROR_CODE.BUNDLE_TOO_SMALL],
      [{ ...bundle, bundlePrice: -1 }, PROMOTION_ERROR_CODE.BUNDLE_PRICE_INVALID],
    ];

    // Act
    const codes = cases.map(([input]) => validatePromotionInput(normalizePromotionInput(input)));

    // Assert
    expect(codes).toEqual(cases.map(([, code]) => code));
  });
});
