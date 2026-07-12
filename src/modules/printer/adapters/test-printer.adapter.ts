import { invoke } from "@tauri-apps/api/core";

interface TestPrinterInput {
  printerType: string;
  printerAddress: string;
}

export async function testPrinter(input: TestPrinterInput): Promise<void> {
  if (input.printerType.trim() === "" || input.printerAddress.trim() === "") {
    throw new Error("Faltan datos de la impresora");
  }

  await invoke("test_printer", {
    input: {
      printerType: input.printerType,
      printerAddress: input.printerAddress,
    },
  });
}
