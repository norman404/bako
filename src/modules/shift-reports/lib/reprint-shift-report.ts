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
  totalLabel: string;
  openingCashLabel: string;
  expectedCashLabel: string;
  countedCashLabel: string;
  differenceLabel: string;
}

interface ReprintShiftReportPayload {
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
  paymentMethod: string;
  paymentAmount: number;
  fulfillmentType: string;
  customer: null;
}

export function reprintShiftReport(
  report: ShiftReport,
  printer: Printer | null,
  labels: ReprintShiftReportLabels,
): ResultAsync<void, Error> {
  if (!printer) {
    return okAsync(undefined);
  }

  const dateStr = report.closedAt
    ? `${new Date(report.openedAt).toLocaleString()} — ${new Date(report.closedAt).toLocaleString()}`
    : new Date(report.openedAt).toLocaleString();

  const payload: ReprintShiftReportPayload = {
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
      ...report.orders.map((order) => ({
        name: `#${order.ticketNumber} — ${formatPosCurrency(order.total)}`,
        quantity: 1,
        unitPrice: 0,
        modifiers: [] as Array<{ groupName: string; optionName: string | null; textValue: string | null }>,
      })),
    ],
    paymentMethod: "cash",
    paymentAmount: report.totalSales,
    fulfillmentType: "local",
    customer: null,
  };

  const invokeAsync = async (): Promise<void> => {
    await invoke("print_ticket", { input: payload });
  };

  return ResultAsync.fromPromise(invokeAsync(), (error) => {
    if (error instanceof Error) return error;
    return new Error(String(error));
  });
}
