import { ResultAsync, okAsync } from "neverthrow";
import { invoke } from "@tauri-apps/api/core";

import { useSettingsStore } from "@/modules/settings/store/settings-store";
import type { PrintOrderOptions } from "@/modules/checkout/domain/print-ticket";

interface PrintTicketPayload {
  printerType: string;
  printerAddress: string;
  ticketNumber: number;
  createdAt: string;
  total: number;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  paymentMethod: string;
  paymentAmount: number;
  fulfillmentType: string;
  customer: { name: string; phone: string; address: string } | null;
}

function buildPayload(input: PrintOrderOptions, printerType: string, printerAddress: string): PrintTicketPayload {
  return {
    printerType,
    printerAddress,
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
    })),
    paymentMethod: input.paymentMethod,
    paymentAmount: input.paymentAmount,
    fulfillmentType: input.fulfillmentType,
    customer: input.customer,
  };
}

export function printOrder(input: PrintOrderOptions): ResultAsync<void, Error> {
  const { printerType, printerAddress } = useSettingsStore.getState();

  if (printerType === "none" || !printerType) {
    return okAsync(undefined);
  }

  const payload = buildPayload(input, printerType, printerAddress ?? "");

  const invokeAsync = async (): Promise<void> => {
    await invoke("print_ticket", { input: payload });
  };

  return ResultAsync.fromPromise(invokeAsync(), (error) => {
    if (error instanceof Error) return error;
    return new Error(String(error));
  });
}

export async function testPrinter(): Promise<void> {
  const { printerType, printerAddress } = useSettingsStore.getState();

  if (printerType === "none" || !printerType) {
    throw new Error("No hay impresora configurada.");
  }

  await invoke("test_printer", {
    input: {
      printerType,
      printerAddress: printerAddress ?? "",
    },
  });
}
