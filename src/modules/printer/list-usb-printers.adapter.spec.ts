import { describe, expect, it, mock, type Mock } from "bun:test";

mock.module("@tauri-apps/api/core", () => ({
  invoke: mock(),
}));

import { invoke } from "@tauri-apps/api/core";
import { listUsbPrinters, type UsbPrinterInfo } from "./list-usb-printers.adapter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedInvoke = invoke as Mock<(...args: any[]) => any>;

describe("listUsbPrinters adapter", () => {
  it("invokes list_usb_printers with no extra arguments", async () => {
    mockedInvoke.mockResolvedValue([]);

    await listUsbPrinters();

    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    expect(mockedInvoke.mock.calls[0]![0]).toBe("list_usb_printers");
    expect(mockedInvoke.mock.calls[0]![1]).toBeUndefined();
  });

  it("returns the array resolved by invoke as-is", async () => {
    const detected: UsbPrinterInfo[] = [
      { vid: 0x04b8, pid: 0x0e15, name: "Epson TM-T20", address: "04B8:0E15" },
    ];
    mockedInvoke.mockResolvedValue(detected);

    const result = await listUsbPrinters();

    expect(result).toEqual(detected);
  });
});
