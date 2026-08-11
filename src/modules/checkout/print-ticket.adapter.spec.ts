import { describe, expect, it, mock, beforeEach, type Mock } from "bun:test";

mock.module("@tauri-apps/api/core", () => ({
  invoke: mock(),
}));

import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/modules/settings";
import { printOrder, type PrintTicketPayload } from "./print-ticket.adapter";
import type { PrintOrderOptions } from "./print-ticket";
import { buildPrinter } from "@/modules/printer/test/factories";
import { PRINTER_TYPE, PRINTER_ROLE } from "@/modules/printer";

const mockedInvoke = invoke as Mock<typeof invoke>;

const baseOptions: PrintOrderOptions = {
  ticketNumber: 42,
  createdAt: new Date("2026-07-11T10:00:00.000Z"),
  total: 550,
  items: [
    {
      name: "Café",
      quantity: 1,
      unitPrice: 300,
      modifiers: [],
    },
  ],
  paymentMethod: "cash",
  paymentAmount: 600,
  fulfillmentType: "local",
  customer: null,
};

describe("print-ticket adapter", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      locale: "es-MX",
      currency: "MXN",
      printerType: "none",
      printerAddress: null,
      isLoading: false,
    });
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValue(undefined);
  });

  it("builds payload with usb printer type and address from the passed printer", async () => {
    const printer = buildPrinter({
      role: PRINTER_ROLE.RECEIPT,
      isDefault: true,
      type: PRINTER_TYPE.USB,
      address: "USB:1234",
    });

    const result = await printOrder(baseOptions, printer);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    expect(mockedInvoke.mock.calls[0]![0]).toBe("print_ticket");
    const args = mockedInvoke.mock.calls[0]?.[1] as { input: PrintTicketPayload } | undefined;
    const payload = args!.input;
    expect(payload.printerType).toBe("usb");
    expect(payload.printerAddress).toBe("USB:1234");
  });

  it("builds payload with network printer address from the passed printer", async () => {
    const printer = buildPrinter({
      role: PRINTER_ROLE.RECEIPT,
      isDefault: true,
      type: PRINTER_TYPE.NETWORK,
      address: "192.168.1.50:9100",
    });

    const result = await printOrder(baseOptions, printer);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    const args = mockedInvoke.mock.calls[0]?.[1] as { input: PrintTicketPayload } | undefined;
    const payload = args!.input;
    expect(payload.printerType).toBe("network");
    expect(payload.printerAddress).toBe("192.168.1.50:9100");
  });

  it("returns ok without invoking when default receipt printer is null", async () => {
    useSettingsStore.setState({
      locale: "es-MX",
      currency: "MXN",
      printerType: "network",
      printerAddress: "10.0.0.1:9100",
      isLoading: false,
    });

    const result = await printOrder(baseOptions, null);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).not.toHaveBeenCalled();
  });

  it("adapter module does not import useSettingsStore", async () => {
    const source = await Bun.file(`${import.meta.dir}/print-ticket.adapter.ts`).text();
    expect(source).not.toContain("useSettingsStore");
  });

  it("builds payload including item modifiers", async () => {
    const printer = buildPrinter({
      role: PRINTER_ROLE.RECEIPT,
      isDefault: true,
      type: PRINTER_TYPE.NETWORK,
      address: "192.168.1.50:9100",
    });

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

    const result = await printOrder(options, printer);

    expect(result.isOk()).toBe(true);
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    const args = mockedInvoke.mock.calls[0]?.[1] as { input: PrintTicketPayload } | undefined;
    const payload = args!.input;
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].modifiers).toEqual([
      { groupName: "Nivel de hielo", optionName: "Sin hielo", textValue: null },
      { groupName: "Nota", optionName: null, textValue: "bien fría" },
    ]);
  });

  it("passes empty modifiers array when item has no modifiers", async () => {
    const printer = buildPrinter({
      role: PRINTER_ROLE.RECEIPT,
      isDefault: true,
      type: PRINTER_TYPE.NETWORK,
      address: "192.168.1.50:9100",
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

    const result = await printOrder(options, printer);

    expect(result.isOk()).toBe(true);
    const args = mockedInvoke.mock.calls[0]?.[1] as { input: PrintTicketPayload } | undefined;
    const payload = args!.input;
    expect(payload.items[0].modifiers).toEqual([]);
  });
});