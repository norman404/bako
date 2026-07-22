import { describe, expect, it, mock, beforeEach, type Mock } from "bun:test";

mock.module("@tauri-apps/api/core", () => ({
  invoke: mock(),
}));

import { invoke } from "@tauri-apps/api/core";
import { printCommand, type PrintCommandPayload } from "./print-command.adapter";
import type { PrintCommandOptions } from "@/modules/checkout/domain/print-command";

const mockedInvoke = invoke as Mock<typeof invoke>;

describe("print-command adapter", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValue(undefined);
  });

  it("builds payload with headerText and invokes print_command", async () => {
    const options: PrintCommandOptions = {
      headerText: "COMANDA",
      items: [
        {
          name: "Taco",
          quantity: 2,
          modifiers: [{ groupName: "Salsa", optionName: "Roja", textValue: null }],
        },
        {
          name: "Agua",
          quantity: 1,
          modifiers: [],
        },
      ],
      destination: {
        printerType: "network",
        printerAddress: "192.168.1.50:9100",
      },
    };

    const result = await printCommand(options);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    expect(mockedInvoke.mock.calls[0]![0]).toBe("print_command");

    const args = mockedInvoke.mock.calls[0]?.[1] as { input: PrintCommandPayload } | undefined;
    const payload = args!.input;
    expect(payload.printerType).toBe("network");
    expect(payload.printerAddress).toBe("192.168.1.50:9100");
    expect(payload.headerText).toBe("COMANDA");
    expect(payload.items).toHaveLength(2);
    expect(payload.items[0]).toEqual({
      name: "Taco",
      quantity: 2,
      modifiers: [{ groupName: "Salsa", optionName: "Roja", textValue: null }],
    });
    expect(payload.items[1]).toEqual({
      name: "Agua",
      quantity: 1,
      modifiers: [],
    });
    expect("ticketNumber" in payload).toBe(false);
    expect("createdAt" in payload).toBe(false);
    expect("fulfillmentType" in payload).toBe(false);
    expect("customer" in payload).toBe(false);
  });

  it("carries a different headerText through unchanged", async () => {
    const options: PrintCommandOptions = {
      headerText: "ENCABEZADO PERSONALIZADO",
      items: [{ name: "Taco", quantity: 1, modifiers: [] }],
      destination: {
        printerType: "usb",
        printerAddress: "04b8:0e15",
      },
    };

    const result = await printCommand(options);

    expect(result.isOk()).toBe(true);
    const args = mockedInvoke.mock.calls[0]?.[1] as { input: PrintCommandPayload } | undefined;
    const payload = args!.input;
    expect(payload.headerText).toBe("ENCABEZADO PERSONALIZADO");
  });
});
