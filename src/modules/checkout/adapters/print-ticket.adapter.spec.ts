import { describe, expect, it, mock, beforeEach, type Mock } from "bun:test";

mock.module("@tauri-apps/api/core", () => ({
  invoke: mock(),
}));

import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/modules/settings/store/settings-store";
import { printOrder } from "@/modules/checkout/adapters/print-ticket.adapter";
import type { PrintOrderOptions } from "@/modules/checkout/domain/print-ticket";

const mockedInvoke = invoke as Mock<typeof invoke>;

describe("print-ticket adapter", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      locale: "es-MX",
      currency: "MXN",
      printerType: "network",
      printerAddress: "192.168.1.50:9100",
      isLoading: false,
    });
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValue(undefined);
  });

  it("builds payload including item modifiers", async () => {
    const options: PrintOrderOptions = {
      ticketNumber: 42,
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
      total: 550,
      items: [
        {
          name: "Café",
          quantity: 1,
          unitPrice: 300,
          modifiers: [
            { groupName: "Nivel de hielo", optionName: "Sin hielo", textValue: null },
            { groupName: "Nota", optionName: null, textValue: "bien fría" },
          ],
        },
      ],
      paymentMethod: "cash",
      paymentAmount: 600,
      fulfillmentType: "local",
      customer: null,
    };

    const result = await printOrder(options);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    const payload = mockedInvoke.mock.calls[0][1].input;
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].modifiers).toEqual([
      { groupName: "Nivel de hielo", optionName: "Sin hielo", textValue: null },
      { groupName: "Nota", optionName: null, textValue: "bien fría" },
    ]);
  });

  it("passes empty modifiers array when item has no modifiers", async () => {
    const options: PrintOrderOptions = {
      ticketNumber: 1,
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
      total: 100,
      items: [{ name: "Agua", quantity: 1, unitPrice: 100, modifiers: [] }],
      paymentMethod: "card",
      paymentAmount: 100,
      fulfillmentType: "local",
      customer: null,
    };

    const result = await printOrder(options);

    expect(result.isOk()).toBe(true);
    const payload = mockedInvoke.mock.calls[0][1].input;
    expect(payload.items[0].modifiers).toEqual([]);
  });

  it("returns ok without invoking when printer type is none", async () => {
    useSettingsStore.setState({
      locale: "es-MX",
      currency: "MXN",
      printerType: "none",
      printerAddress: null,
      isLoading: false,
    });

    const options: PrintOrderOptions = {
      ticketNumber: 1,
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
      total: 100,
      items: [{ name: "Agua", quantity: 1, unitPrice: 100, modifiers: [] }],
      paymentMethod: "card",
      paymentAmount: 100,
      fulfillmentType: "local",
      customer: null,
    };

    const result = await printOrder(options);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).not.toHaveBeenCalled();
  });
});
