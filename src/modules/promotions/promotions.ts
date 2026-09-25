import { isScheduleActive } from "@/lib/weekly-schedule";

import {
  PROMOTION_TYPE,
  type PricedCart,
  type PricedSegment,
  type PricingLine,
  type Promotion,
  type PromotionApplication,
  type PromotionTarget,
} from "./types";

// Beyond this many search nodes the optimizer stops exploring and finishes greedily, so a
// very large cart still prices instantly instead of freezing the register.
const SEARCH_NODE_LIMIT = 20_000;

interface PricingUnit {
  lineIndex: number;
  productId: string;
  categoryId: string;
  // Discountable price of the unit, not what it is charged.
  price: number;
  addedAt: number;
}

interface CandidateApplication {
  promotion: Promotion;
  unitIndexes: number[];
  discounts: number[];
  savings: number;
}

interface SearchResult {
  savings: number;
  applications: CandidateApplication[];
}

// Promotions discount the product itself: paid modifiers such as extra toppings are always
// charged on top. Capping at the charged price keeps a negative modifier from producing a
// discount larger than the line.
function discountablePrice(line: PricingLine): number {
  return Math.max(0, Math.min(line.basePrice, line.unitPrice));
}

function expandUnits(lines: PricingLine[]): PricingUnit[] {
  const units = lines.flatMap((line, lineIndex) =>
    line.unitAddedAt.map((addedAt) => ({
      lineIndex,
      productId: line.productId,
      categoryId: line.categoryId,
      price: discountablePrice(line),
      addedAt,
    })),
  );

  // Most expensive first: every promotion then consumes the units that save the customer the most.
  return units.sort((a, b) => b.price - a.price || a.lineIndex - b.lineIndex || a.addedAt - b.addedAt);
}

function matchesTarget(unit: PricingUnit, target: PromotionTarget): boolean {
  return target.productId !== null ? target.productId === unit.productId : target.categoryId === unit.categoryId;
}

function isEligible(unit: PricingUnit, promotion: Promotion): boolean {
  return (
    promotion.targets.some((target) => matchesTarget(unit, target)) &&
    isScheduleActive(promotion.schedule, new Date(unit.addedAt))
  );
}

// Integer cents proportional to each price; leftover cents go to the largest remainders.
export function allocateProportionally(amount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight === 0) return weights.map(() => 0);

  const exact = weights.map((weight) => (amount * weight) / totalWeight);
  const shares = exact.map(Math.floor);
  let remainder = amount - shares.reduce((sum, share) => sum + share, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder === 0) break;
    shares[index] += 1;
    remainder -= 1;
  }

  return shares;
}

function buildNxmCandidate(
  promotion: Promotion,
  units: PricingUnit[],
  eligible: boolean[],
  used: boolean[],
): CandidateApplication | null {
  const buyQuantity = promotion.buyQuantity ?? 0;
  const freeQuantity = buyQuantity - (promotion.payQuantity ?? buyQuantity);
  if (buyQuantity < 2 || freeQuantity <= 0) return null;

  const unitIndexes: number[] = [];
  for (let index = 0; index < units.length && unitIndexes.length < buyQuantity; index += 1) {
    if (eligible[index] && !used[index]) unitIndexes.push(index);
  }
  if (unitIndexes.length < buyQuantity) return null;

  // Units are sorted by price, so the last ones picked are the cheapest: those are free.
  const discounts = unitIndexes.map((unitIndex, position) =>
    position >= buyQuantity - freeQuantity ? units[unitIndex].price : 0,
  );
  const savings = discounts.reduce((sum, discount) => sum + discount, 0);
  return savings > 0 ? { promotion, unitIndexes, discounts, savings } : null;
}

function buildBundleCandidate(
  promotion: Promotion,
  units: PricingUnit[],
  eligible: boolean[],
  used: boolean[],
): CandidateApplication | null {
  if (promotion.bundlePrice === null || promotion.targets.length === 0) return null;

  // Specific products are filled before categories so a category never steals the only unit
  // that a product target could use.
  const targets = [...promotion.targets].sort(
    (a, b) => Number(a.productId === null) - Number(b.productId === null),
  );
  const taken = new Set<number>();

  for (const target of targets) {
    let remaining = target.quantity;
    for (let index = 0; index < units.length && remaining > 0; index += 1) {
      if (!eligible[index] || used[index] || taken.has(index) || !matchesTarget(units[index], target)) continue;
      taken.add(index);
      remaining -= 1;
    }
    if (remaining > 0) return null;
  }

  const unitIndexes = [...taken].sort((a, b) => a - b);
  const listTotal = unitIndexes.reduce((sum, index) => sum + units[index].price, 0);
  const savings = listTotal - promotion.bundlePrice;
  if (savings <= 0) return null;

  const discounts = allocateProportionally(
    savings,
    unitIndexes.map((index) => units[index].price),
  );
  return { promotion, unitIndexes, discounts, savings };
}

function buildCandidate(
  promotion: Promotion,
  units: PricingUnit[],
  eligible: boolean[],
  used: boolean[],
): CandidateApplication | null {
  return promotion.type === PROMOTION_TYPE.NXM
    ? buildNxmCandidate(promotion, units, eligible, used)
    : buildBundleCandidate(promotion, units, eligible, used);
}

function markUnits(used: boolean[], candidate: CandidateApplication, value: boolean): void {
  for (const index of candidate.unitIndexes) used[index] = value;
}

function greedy(
  promotions: Promotion[],
  units: PricingUnit[],
  eligibility: boolean[][],
  used: boolean[],
): SearchResult {
  const applications: CandidateApplication[] = [];
  let savings = 0;

  for (;;) {
    let best: CandidateApplication | null = null;
    for (const [index, promotion] of promotions.entries()) {
      const candidate = buildCandidate(promotion, units, eligibility[index], used);
      if (candidate && (!best || candidate.savings > best.savings)) best = candidate;
    }
    if (!best) break;

    markUnits(used, best, true);
    applications.push(best);
    savings += best.savings;
  }

  for (const application of applications) markUnits(used, application, false);
  return { savings, applications };
}

// Depth-first search over which promotion claims units next, memoized on the set of units
// still free. It finds the combination that saves the customer the most.
function findBestApplications(promotions: Promotion[], units: PricingUnit[]): CandidateApplication[] {
  const eligibility = promotions.map((promotion) => units.map((unit) => isEligible(unit, promotion)));
  const used = units.map(() => false);
  const memo = new Map<string, SearchResult>();
  let nodes = 0;

  function search(): SearchResult {
    const key = used.map((value) => (value ? "1" : "0")).join("");
    const cached = memo.get(key);
    if (cached) return cached;

    nodes += 1;
    if (nodes > SEARCH_NODE_LIMIT) return greedy(promotions, units, eligibility, used);

    let best: SearchResult = { savings: 0, applications: [] };
    promotions.forEach((promotion, index) => {
      const candidate = buildCandidate(promotion, units, eligibility[index], used);
      if (!candidate) return;

      markUnits(used, candidate, true);
      const rest = search();
      markUnits(used, candidate, false);

      const savings = candidate.savings + rest.savings;
      if (savings > best.savings) best = { savings, applications: [candidate, ...rest.applications] };
    });

    memo.set(key, best);
    return best;
  }

  return search().applications;
}

function ruleSnapshot(promotion: Promotion): Record<string, unknown> {
  return {
    type: promotion.type,
    buyQuantity: promotion.buyQuantity,
    payQuantity: promotion.payQuantity,
    bundlePrice: promotion.bundlePrice,
    targets: promotion.targets,
    schedule: promotion.schedule,
  };
}

function buildSegments(
  lines: PricingLine[],
  units: PricingUnit[],
  unitApplication: Array<{ ref: string; discount: number } | null>,
  applicationOrder: string[],
): PricedSegment[] {
  return lines.flatMap((line, lineIndex) => {
    const byRef = new Map<string | null, PricedSegment>();

    units.forEach((unit, unitIndex) => {
      if (unit.lineIndex !== lineIndex) return;
      const assignment = unitApplication[unitIndex];
      const ref = assignment?.ref ?? null;
      const segment = byRef.get(ref) ?? {
        lineId: line.lineId,
        quantity: 0,
        unitPrice: line.unitPrice,
        discountAmount: 0,
        applicationRef: ref,
      };
      segment.quantity += 1;
      segment.discountAmount += assignment?.discount ?? 0;
      byRef.set(ref, segment);
    });

    return [...byRef.values()].sort((a, b) => {
      if (a.applicationRef === b.applicationRef) return 0;
      if (a.applicationRef === null) return 1;
      if (b.applicationRef === null) return -1;
      return applicationOrder.indexOf(a.applicationRef) - applicationOrder.indexOf(b.applicationRef);
    });
  });
}

export function applyPromotions(lines: PricingLine[], promotions: Promotion[]): PricedCart {
  const activePromotions = promotions
    .filter((promotion) => promotion.isActive)
    .sort((a, b) => a.id.localeCompare(b.id));
  const units = expandUnits(lines);
  const chosen = activePromotions.length === 0 ? [] : findBestApplications(activePromotions, units);

  const unitApplication: Array<{ ref: string; discount: number } | null> = units.map(() => null);
  const applications: PromotionApplication[] = chosen.map((candidate, index) => {
    const ref = `promo-${index + 1}`;
    candidate.unitIndexes.forEach((unitIndex, position) => {
      unitApplication[unitIndex] = { ref, discount: candidate.discounts[position] };
    });
    return {
      ref,
      promotionId: candidate.promotion.id,
      kind: candidate.promotion.type,
      name: candidate.promotion.name,
      ruleSnapshot: ruleSnapshot(candidate.promotion),
      discountAmount: candidate.savings,
    };
  });

  const segments = buildSegments(
    lines,
    units,
    unitApplication,
    applications.map((application) => application.ref),
  );
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.unitAddedAt.length, 0);
  const discountTotal = applications.reduce((sum, application) => sum + application.discountAmount, 0);

  return { segments, applications, subtotal, discountTotal, total: subtotal - discountTotal };
}
