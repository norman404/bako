import { ResultAsync, okAsync } from "neverthrow";
import { invoke } from "@tauri-apps/api/core";

import type { Printer } from "@/modules/printer";
import type { PrintOrderOptions } from "./print-ticket";

export interface PrintTicketPayload {
  printerType: string;
  printerAddress: string;
  orderName: string | null;
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

export function buildPrintTicketPayload(
  input: PrintOrderOptions,
  printerType: string,
  printerAddress: string,
): PrintTicketPayload {
  return {
    printerType,
    printerAddress,
    orderName: input.orderName,
    ticketNumber: input.ticketNumber,
    createdAt: input.createdAt.toLocaleString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    total: input.total,
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      modifiers: item.modifiers,
    })),
    payments: input.payments.map((payment) => ({
      method: payment.method,
      amount: payment.amount,
      cashReceived: payment.cashReceived,
    })),
  };
}

export function printOrder(
  input: PrintOrderOptions,
  defaultReceiptPrinter: Printer | null,
): ResultAsync<void, Error> {
  if (defaultReceiptPrinter === null) {
    return okAsync(undefined);
  }

  const payload = buildPrintTicketPayload(
    input,
    defaultReceiptPrinter.type,
    defaultReceiptPrinter.address,
  );

  const invokeAsync = async (): Promise<void> => {
    await invoke("print_ticket", { input: payload });
  };

  return ResultAsync.fromPromise(invokeAsync(), (error) => {
    if (error instanceof Error) return error;
    return new Error(String(error));
  });
}
