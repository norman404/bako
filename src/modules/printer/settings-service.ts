import { archivePrinter } from "./archive-printer";
import { createPrinter } from "./create-printer";
import { listUsbPrinters, type UsbPrinterInfo } from "./list-usb-printers.adapter";
import { listPrinters } from "./list-printers";
import type { Printer, PrinterCreateInput, PrinterUpdateInput } from "./printer";
import { printerDrizzleRepository } from "./repository";
import { testPrinter } from "./test-printer.adapter";
import { updatePrinter } from "./update-printer";

export interface PrinterTestInput {
  printerType: string;
  printerAddress: string;
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelLanguage?: string;
}

async function list(): Promise<Printer[]> {
  const result = await listPrinters(printerDrizzleRepository);
  if (result.isErr()) throw result.error;
  return result.value;
}

async function create(input: PrinterCreateInput): Promise<Printer> {
  const result = await createPrinter(printerDrizzleRepository, input);
  if (result.isErr()) throw result.error;
  return result.value;
}

async function update(id: string, input: PrinterUpdateInput): Promise<Printer> {
  const result = await updatePrinter(printerDrizzleRepository, id, input);
  if (result.isErr()) throw result.error;
  return result.value;
}

async function archive(id: string): Promise<void> {
  const result = await archivePrinter(printerDrizzleRepository, id);
  if (result.isErr()) throw result.error;
}

const printerSettingsService = {
  list,
  create,
  update,
  archive,
  listUsb: (): Promise<UsbPrinterInfo[]> => listUsbPrinters(),
  test: (input: PrinterTestInput): Promise<void> => testPrinter(input),
};

export { printerSettingsService };
export type { UsbPrinterInfo };
