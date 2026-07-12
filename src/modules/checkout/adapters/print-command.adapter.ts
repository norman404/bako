import { ResultAsync } from "neverthrow";
import { invoke } from "@tauri-apps/api/core";

import type { PrintCommandOptions } from "@/modules/checkout/domain/print-command";

interface PrintCommandPayload {
  printerType: string;
  printerAddress: string;
  ticketNumber: number;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    modifiers: Array<{
      groupName: string;
      optionName: string | null;
      textValue: string | null;
    }>;
  }>;
  fulfillmentType: string;
  customer: { name: string; phone: string; address: string } | null;
}

function buildPayload(input: PrintCommandOptions): PrintCommandPayload {
  return {
    printerType: input.destination.printerType,
    printerAddress: input.destination.printerAddress,
    ticketNumber: input.ticketNumber,
    createdAt: input.createdAt.toLocaleString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers,
    })),
    fulfillmentType: input.fulfillmentType,
    customer: input.customer,
  };
}

export function printCommand(input: PrintCommandOptions): ResultAsync<void, Error> {
  const payload = buildPayload(input);

  const invokeAsync = async (): Promise<void> => {
    await invoke("print_command", { input: payload });
  };

  return ResultAsync.fromPromise(invokeAsync(), (error) => {
    if (error instanceof Error) return error;
    return new Error(String(error));
  });
}
