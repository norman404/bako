import { ResultAsync } from "neverthrow";
import { invoke } from "@tauri-apps/api/core";

import type { PrintCommandOptions } from "@/modules/checkout/domain/print-command";

export interface PrintCommandPayload {
  printerType: string;
  printerAddress: string;
  headerText: string;
  items: Array<{
    name: string;
    quantity: number;
    modifiers: Array<{
      groupName: string;
      optionName: string | null;
      textValue: string | null;
    }>;
  }>;
}

function buildPayload(input: PrintCommandOptions): PrintCommandPayload {
  return {
    printerType: input.destination.printerType,
    printerAddress: input.destination.printerAddress,
    headerText: input.headerText,
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers,
    })),
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
