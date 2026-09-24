import type { WeeklySchedule } from "@/lib/weekly-schedule";

export const PROMOTION_TYPE = {
  NXM: "nxm",
  BUNDLE: "bundle",
} as const;

export type PromotionType = (typeof PROMOTION_TYPE)[keyof typeof PROMOTION_TYPE];

export const APPLIED_PROMOTION_KIND = {
  ...PROMOTION_TYPE,
  COMPOSITE: "composite",
} as const;

export type AppliedPromotionKind = (typeof APPLIED_PROMOTION_KIND)[keyof typeof APPLIED_PROMOTION_KIND];

const APPLIED_PROMOTION_KIND_VALUES = new Set<string>(Object.values(APPLIED_PROMOTION_KIND));

export function isAppliedPromotionKind(value: string): value is AppliedPromotionKind {
  return APPLIED_PROMOTION_KIND_VALUES.has(value);
}

export interface PromotionTarget {
  productId: string | null;
  categoryId: string | null;
  quantity: number;
}

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  buyQuantity: number | null;
  payQuantity: number | null;
  bundlePrice: number | null;
  schedule: WeeklySchedule;
  isActive: boolean;
  targets: PromotionTarget[];
}

export interface PricingLine {
  lineId: string;
  productId: string;
  categoryId: string;
  unitPrice: number;
  unitAddedAt: number[];
}

export interface PricedSegment {
  lineId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  applicationRef: string | null;
}

export interface PromotionApplication {
  ref: string;
  promotionId: string | null;
  kind: AppliedPromotionKind;
  name: string;
  ruleSnapshot: Record<string, unknown>;
  discountAmount: number;
}

export interface PricedCart {
  segments: PricedSegment[];
  applications: PromotionApplication[];
  subtotal: number;
  discountTotal: number;
  total: number;
}
