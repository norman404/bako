import { describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { testPrinter } from "./test-printer.adapter";

const mockedInvoke = invoke as Mock;

describe("testPrinter adapter", () => {
  it("invokes test_printer with type and address", async () => {
    mockedInvoke.mockResolvedValue(undefined);

    await testPrinter({ printerType: "network", printerAddress: "192.168.1.50:9100" });

    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    expect(mockedInvoke.mock.calls[0]![0]).toBe("test_printer");
    expect(mockedInvoke.mock.calls[0]![1].input).toEqual({
      printerType: "network",
      printerAddress: "192.168.1.50:9100",
    });
  });

  it("throws when type or address is missing", async () => {
    await expect(testPrinter({ printerType: "", printerAddress: "192.168.1.50:9100" })).rejects.toThrow(
      "Faltan datos de la impresora",
    );
    await expect(testPrinter({ printerType: "network", printerAddress: "" })).rejects.toThrow(
      "Faltan datos de la impresora",
    );
  });
});
