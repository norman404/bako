import { describe, expect, it, mock, beforeEach, type Mock } from "bun:test";

mock.module("@tauri-apps/api/core", () => ({
  invoke: mock(),
}));

import { invoke } from "@tauri-apps/api/core";
import { reprintShiftReport, type ReprintShiftReportLabels } from "./reprint-shift-report";
import { buildPrinter } from "@/modules/printer/test/factories";
import type { ShiftReport } from "../shift";

const mockedInvoke = invoke as Mock<typeof invoke>;

const LABELS: ReprintShiftReportLabels = {
  title: "Reporte de turno",
  ordersLabel: "Órdenes",
  itemsLabel: "Productos vendidos",
  cashLabel: "Efectivo",
  cardLabel: "Tarjeta",
  totalLabel: "Total vendido",
  openingCashLabel: "Efectivo inicial",
  expectedCashLabel: "Efectivo esperado",
  countedCashLabel: "Efectivo contado",
  differenceLabel: "Diferencia",
};

function buildReport(overrides: Partial<ShiftReport> = {}): ShiftReport {
  return {
    shiftId: "shift-1",
    openedAt: new Date("2026-06-04T08:00:00.000Z"),
    closedAt: new Date("2026-06-04T18:00:00.000Z"),
    totalOrders: 3,
    totalItems: 7,
    totalSales: 15000,
    cashTotal: 10000,
    cardTotal: 5000,
    orders: [
      {
        orderId: "order-1",
        ticketNumber: 42,
        createdAt: new Date("2026-06-04T10:00:00.000Z"),
        total: 5000,
        paymentMethod: "cash",
        itemCount: 2,
        items: [],
        isVoided: false,
      },
    ],
    openingCash: 10000,
    cashMovementsIn: 2000,
    cashMovementsOut: 1000,
    expectedCash: 11000,
    countedCash: 11000,
    cashDifference: 0,
    cashMovements: [],
    ...overrides,
  };
}

describe("reprintShiftReport", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValue(undefined);
  });

  it("printer null → no invoca print_ticket y resuelve ok", async () => {
    const result = await reprintShiftReport(buildReport(), null, LABELS);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).not.toHaveBeenCalled();
  });

  it("usa los labels traducidos en las líneas del ticket, sin emoji ni texto hardcodeado", async () => {
    const printer = buildPrinter({ id: "p-1", type: "network", address: "192.168.1.10:9100" });
    const report = buildReport();

    const result = await reprintShiftReport(report, printer, LABELS);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    const args = mockedInvoke.mock.calls[0]?.[1] as { input: { items: Array<{ name: string }> } };
    const names = args.input.items.map((item) => item.name);
    expect(names[0]).toBe(LABELS.title);
    expect(names[0]).not.toContain("📊");
    expect(names[1]).toBe(`${LABELS.ordersLabel}: ${report.totalOrders}`);
    expect(names[2]).toBe(`${LABELS.itemsLabel}: ${report.totalItems}`);
    expect(names[3]).toContain(LABELS.cashLabel);
    expect(names[4]).toContain(LABELS.cardLabel);
    expect(names[5]).toContain(LABELS.totalLabel);
    expect(names.some((n) => n.includes("#42"))).toBe(true);
  });
});

describe("reprintShiftReport — cash lines", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValue(undefined);
  });

  it("includes opening cash line in the ticket", async () => {
    const printer = buildPrinter({ id: "p-1", type: "network", address: "192.168.1.10:9100" });
    const report = buildReport({ openingCash: 10000 });
    const result = await reprintShiftReport(report, printer, LABELS);
    expect(result.isOk()).toBe(true);
    const args = mockedInvoke.mock.calls[0]?.[1] as { input: { items: Array<{ name: string }> } };
    const names = args.input.items.map((item) => item.name);
    expect(names.some((n) => n.includes(LABELS.openingCashLabel))).toBe(true);
  });

  it("includes expected cash, counted cash, and difference lines for closed shifts", async () => {
    const printer = buildPrinter({ id: "p-1", type: "network", address: "192.168.1.10:9100" });
    const report = buildReport({
      openingCash: 10000,
      cashTotal: 5000,
      cashMovementsIn: 2000,
      cashMovementsOut: 1000,
      expectedCash: 16000,
      countedCash: 15500,
      cashDifference: -500,
    });
    const result = await reprintShiftReport(report, printer, LABELS);
    expect(result.isOk()).toBe(true);
    const args = mockedInvoke.mock.calls[0]?.[1] as { input: { items: Array<{ name: string }> } };
    const names = args.input.items.map((item) => item.name);
    expect(names.some((n) => n.includes(LABELS.expectedCashLabel))).toBe(true);
    expect(names.some((n) => n.includes(LABELS.countedCashLabel))).toBe(true);
    expect(names.some((n) => n.includes(LABELS.differenceLabel))).toBe(true);
  });

  it("omits counted cash and difference lines for active shifts (null values)", async () => {
    const printer = buildPrinter({ id: "p-1", type: "network", address: "192.168.1.10:9100" });
    const report = buildReport({
      closedAt: null,
      countedCash: null,
      cashDifference: null,
    });
    const result = await reprintShiftReport(report, printer, LABELS);
    expect(result.isOk()).toBe(true);
    const args = mockedInvoke.mock.calls[0]?.[1] as { input: { items: Array<{ name: string }> } };
    const names = args.input.items.map((item) => item.name);
    expect(names.some((n) => n.includes(LABELS.countedCashLabel))).toBe(false);
    expect(names.some((n) => n.includes(LABELS.differenceLabel))).toBe(false);
  });
});
