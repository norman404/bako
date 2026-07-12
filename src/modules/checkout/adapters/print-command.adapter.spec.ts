import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { printCommand } from "./print-command.adapter";
import type { PrintCommandOptions } from "@/modules/checkout/domain/print-command";

const mockedInvoke = invoke as Mock;

describe("print-command adapter", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValue(undefined);
  });

  it("builds payload without prices and invokes print_command", async () => {
    const options: PrintCommandOptions = {
      ticketNumber: 42,
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
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
      fulfillmentType: "local",
      customer: null,
      destination: {
        printerType: "network",
        printerAddress: "192.168.1.50:9100",
      },
    };

    const result = await printCommand(options);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    expect(mockedInvoke.mock.calls[0]![0]).toBe("print_command");

    const payload = mockedInvoke.mock.calls[0]![1].input;
    expect(payload.printerType).toBe("network");
    expect(payload.printerAddress).toBe("192.168.1.50:9100");
    expect(payload.ticketNumber).toBe(42);
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
    expect("total" in payload).toBe(false);
    expect("paymentMethod" in payload).toBe(false);
  });

  it("includes customer when provided", async () => {
    const options: PrintCommandOptions = {
      ticketNumber: 7,
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
      items: [{ name: "Taco", quantity: 1, modifiers: [] }],
      fulfillmentType: "delivery",
      customer: { name: "Juan", phone: "5551234", address: "Calle 1" },
      destination: {
        printerType: "usb",
        printerAddress: "04b8:0e15",
      },
    };

    const result = await printCommand(options);

    expect(result.isOk()).toBe(true);
    const payload = mockedInvoke.mock.calls[0]![1].input;
    expect(payload.customer).toEqual({ name: "Juan", phone: "5551234", address: "Calle 1" });
    expect(payload.fulfillmentType).toBe("delivery");
  });
});
