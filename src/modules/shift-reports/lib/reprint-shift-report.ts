import { ResultAsync, okAsync } from "neverthrow";
import { invoke } from "@tauri-apps/api/core";

import type { Printer } from "@/modules/printer";
import type { ShiftReport } from "../shift";
import { formatPosCurrency } from "@/lib/currency";

export interface ReprintShiftReportLabels {
  title: string;
  ordersLabel: string;
  itemsLabel: string;
  cashLabel: string;
  cardLabel: string;
  platformLabel: string;
  localLabel: string;
  pendingLabel: string;
  voidedLabel: string;
  totalLabel: string;
  openingCashLabel: string;
  expectedCashLabel: string;
  countedCashLabel: string;
  differenceLabel: string;
  categorySalesLabel: string;
  uncategorizedCategoryLabel: string;
  itemCountLabel: string;
}

export interface ReprintShiftReportPayload {
  printerType: string;
  printerAddress: string;
  ticketNumber: number;
  createdAt: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    modifiers: Array<{
      groupName: string;
      optionName: string | null;
      textValue: string | null;
    }>;
  }>;
  payments: Array<{
    method: string;
    amount: number;
    cashReceived: number | null;
  }>;
}

type ReprintShiftReportItem = ReprintShiftReportPayload["items"][number];

function createSummaryItem(name: string, totalSales = 0): ReprintShiftReportItem {
  return {
    name,
    quantity: 1,
    unitPrice: totalSales,
    modifiers: [],
  };
}

function buildCategorySummaryItems(
  report: ShiftReport,
  labels: ReprintShiftReportLabels,
): ReprintShiftReportItem[] {
  if (report.salesByCategory.length === 0) return [];

  return [
    createSummaryItem(labels.categorySalesLabel),
    ...report.salesByCategory.map((category) => {
      const categoryName = category.categoryName ?? labels.uncategorizedCategoryLabel;
      return createSummaryItem(
        `${categoryName} — ${category.totalItems} ${labels.itemCountLabel}`,
        category.totalSales,
      );
    }),
  ];
}

export function buildReprintShiftReportPayload(
  report: ShiftReport,
  printer: Pick<Printer, "type" | "address">,
  labels: ReprintShiftReportLabels,
  categoriesEnabled: boolean,
): ReprintShiftReportPayload {
  const dateStr = report.closedAt
    ? `${new Date(report.openedAt).toLocaleString()} — ${new Date(report.closedAt).toLocaleString()}`
    : new Date(report.openedAt).toLocaleString();

  return {
    printerType: printer.type,
    printerAddress: printer.address,
    ticketNumber: 0,
    createdAt: dateStr,
    total: report.totalSales,
    items: [
      {
        name: labels.title,
        quantity: 1,
        unitPrice: 0,
        modifiers: [],
      },
      {
        name: `${labels.ordersLabel}: ${report.totalOrders}`,
        quantity: 1,
        unitPrice: 0,
        modifiers: [],
      },
      {
        name: `${labels.itemsLabel}: ${report.totalItems}`,
        quantity: 1,
        unitPrice: 0,
        modifiers: [],
      },
      {
        name: `${labels.cashLabel}: ${formatPosCurrency(report.cashTotal)}`,
        quantity: 1,
        unitPrice: 0,
        modifiers: [],
      },
      {
        name: `${labels.cardLabel}: ${formatPosCurrency(report.cardTotal)}`,
        quantity: 1,
        unitPrice: 0,
        modifiers: [],
      },
      {
        name: `${labels.totalLabel}: ${formatPosCurrency(report.totalSales)}`,
        quantity: 1,
        unitPrice: 0,
        modifiers: [],
      },
      {
        name: `${labels.openingCashLabel}: ${formatPosCurrency(report.openingCash)}`,
        quantity: 1,
        unitPrice: 0,
        modifiers: [],
      },
      {
        name: `${labels.expectedCashLabel}: ${formatPosCurrency(report.expectedCash)}`,
        quantity: 1,
        unitPrice: 0,
        modifiers: [],
      },
      ...(report.countedCash !== null
        ? [
            {
              name: `${labels.countedCashLabel}: ${formatPosCurrency(report.countedCash)}`,
              quantity: 1,
              unitPrice: 0,
              modifiers: [],
            },
          ]
        : []),
      ...(report.cashDifference !== null
        ? [
            {
              name: `${labels.differenceLabel}: ${report.cashDifference >= 0 ? "+" : ""}${formatPosCurrency(report.cashDifference)}`,
              quantity: 1,
              unitPrice: 0,
              modifiers: [],
            },
          ]
        : []),
      createSummaryItem(`${labels.localLabel}: ${formatPosCurrency(report.localTotal)}`),
      createSummaryItem(`Uber Eats: ${formatPosCurrency(report.uberTotal)}`),
      createSummaryItem(`DiDi: ${formatPosCurrency(report.didiTotal)}`),
      createSummaryItem(`${labels.platformLabel}: ${formatPosCurrency(report.platformTotal)}`),
      createSummaryItem(`${labels.pendingLabel}: ${report.pendingDeliveries}`),
      ...(categoriesEnabled ? buildCategorySummaryItems(report, labels) : []),
      ...report.orders.map((order) => ({
        name: [
          `#${order.ticketNumber}`,
          order.channel === "local" ? null : order.channel === "didi" ? "DiDi" : "Uber Eats",
          order.deliveryReference,
          order.isPending ? labels.pendingLabel : formatPosCurrency(order.total),
          order.isVoided ? labels.voidedLabel : null,
        ].filter(Boolean).join(" — "),
        quantity: 1,
        unitPrice: 0,
        modifiers: [] as Array<{ groupName: string; optionName: string | null; textValue: string | null }>,
      })),
    ],
    payments: [
      { method: "cash", amount: report.cashTotal, cashReceived: report.cashTotal },
      { method: "card", amount: report.cardTotal, cashReceived: null },
      { method: "platform", amount: report.platformTotal, cashReceived: null },
    ].filter((payment) => payment.amount > 0),
  };
}

export function reprintShiftReport(
  report: ShiftReport,
  printer: Printer | null,
  labels: ReprintShiftReportLabels,
  categoriesEnabled = false,
): ResultAsync<void, Error> {
  if (!printer) {
    return okAsync(undefined);
  }

  const payload = buildReprintShiftReportPayload(report, printer, labels, categoriesEnabled);

  const invokeAsync = async (): Promise<void> => {
    await invoke("print_ticket", { input: payload });
  };

  return ResultAsync.fromPromise(invokeAsync(), (error) => {
    if (error instanceof Error) return error;
    return new Error(String(error));
  });
}
