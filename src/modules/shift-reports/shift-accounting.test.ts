import { describe, expect, it } from "vitest";
import { projectShiftOrder, summarizeShiftOrders, type AccountingOrder, type AccountingShift } from "./shift-accounting";
import type { ShiftReportOrder, ShiftReportPayment } from "./shift";

const CLOSED_AT = new Date("2026-08-01T16:00:00Z");
const LATER = new Date("2026-08-01T17:00:00Z");
const PENDING: AccountingOrder = {
  id: "delivery", channel: "didi", shiftId: "A", financialShiftId: null,
  createdAt: new Date("2026-08-01T15:00:00Z"), confirmedAt: null, voidedAt: null, total: 0,
};
const A: AccountingShift = { id: "A", closedAt: CLOSED_AT, deliveryPendingIds: ["delivery"] };
const B: AccountingShift = { id: "B", closedAt: null };

function reportOrders(order: AccountingOrder, shift: AccountingShift, payments: ShiftReportPayment[]): ShiftReportOrder[] {
  const projection = projectShiftOrder(order, shift, LATER);
  return projection ? [{
    orderId: order.id, channel: "didi", deliveryReference: "APP-42", orderName: null,
    ticketNumber: 42, createdAt: order.createdAt, total: projection.total,
    isPending: projection.isPending, isVoided: projection.isVoided, canModify: projection.canModify,
    payments: projection.includePayments ? payments : [], itemCount: 2, items: [],
  }] : [];
}

describe("delivery shift accounting", () => {
  // CASE: A delivery is pending when A closes, then the courier pays $150 in B.
  // VALIDATES: The closed report retains its original pending entry and no income moves backwards.
  it("should preserve the closed cut and count cash once when a pending order is collected in the next shift", () => {
    // Arrange
    const confirmed = { ...PENDING, confirmedAt: LATER, financialShiftId: "B", total: 15000 };
    const payment = [{ method: "cash", amount: 15000, cashReceived: 15000 }];
    const before = summarizeShiftOrders(reportOrders(PENDING, A, []));
    // Act
    const after = summarizeShiftOrders(reportOrders(confirmed, A, payment));
    const next = summarizeShiftOrders(reportOrders(confirmed, B, payment));
    // Assert
    expect(after).toEqual(before);
    expect(after).toMatchObject({ pendingDeliveries: 1, totalSales: 0, cashTotal: 0, totalOrders: 0 });
    expect(next).toMatchObject({ pendingDeliveries: 0, totalSales: 15000, cashTotal: 15000, didiTotal: 15000, totalOrders: 1 });
    expect(reportOrders(confirmed, A, payment)[0]).toMatchObject({ total: 0, payments: [], canModify: false });
  });

  // CASE: Two operations happen within the same millisecond around shift closure.
  // VALIDATES: The saved pending list, not timestamp coincidence, preserves the closed report.
  it("should retain the frozen pending state when confirmation shares the closure timestamp", () => {
    // Arrange
    const confirmed = { ...PENDING, confirmedAt: CLOSED_AT, financialShiftId: "B", total: 5000 };
    // Act
    const previous = projectShiftOrder(confirmed, A, LATER);
    // Assert
    expect(previous).toMatchObject({ isPending: true, total: 0, includePayments: false, countsAsSale: false });
  });

  // CASE: A pending delivery is later cancelled instead of collected.
  // VALIDATES: Earlier cuts keep the pending snapshot, while active totals exclude the cancelled order.
  it("should keep the previous pending entry when a delivery is cancelled later", () => {
    // Arrange
    const cancelled = { ...PENDING, voidedAt: LATER };
    // Act
    const previous = projectShiftOrder(cancelled, A, LATER);
    const current = projectShiftOrder(cancelled, B, LATER);
    // Assert
    expect(previous).toMatchObject({ isPending: true, isVoided: false, total: 0 });
    expect(current).toBeNull();
  });

  // CASE: A confirmed DiDi order is paid in the app rather than in the drawer.
  // VALIDATES: Sales count the final amount but neither cash nor terminal card totals change.
  it("should separate platform collection when summarizing confirmed delivery sales", () => {
    // Arrange
    const order = { ...PENDING, confirmedAt: LATER, financialShiftId: "B", total: 5000 };
    const payments = [{ method: "platform", amount: 5000, cashReceived: null }];
    // Act
    const totals = summarizeShiftOrders(reportOrders(order, B, payments));
    // Assert
    expect(totals).toMatchObject({ totalSales: 5000, platformTotal: 5000, cashTotal: 0, cardTotal: 0, localTotal: 0 });
  });

  // CASE: A pending order carries over multiple shifts without being collected.
  // VALIDATES: Pending work stays visible but never creates a sale.
  it("should carry pending work forward when a new shift opens", () => {
    // Arrange
    const payments: ShiftReportPayment[] = [];
    // Act
    const totals = summarizeShiftOrders(reportOrders(PENDING, B, payments));
    // Assert
    expect(totals).toMatchObject({ pendingDeliveries: 1, totalSales: 0, totalItems: 0, cashTotal: 0 });
  });
});
