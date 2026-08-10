import { invoke } from "@tauri-apps/api/core";

export interface UsbPrinterInfo {
  vid: number;
  pid: number;
  name: string;
  address: string;
}

export async function listUsbPrinters(): Promise<UsbPrinterInfo[]> {
  return invoke("list_usb_printers");
}
