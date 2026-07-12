export const PRINTER_TYPE = {
  USB: "usb",
  NETWORK: "network",
} as const;

export type PrinterType = (typeof PRINTER_TYPE)[keyof typeof PRINTER_TYPE];

export const PRINTER_ROLE = {
  RECEIPT: "receipt",
  KITCHEN: "kitchen",
  BAR: "bar",
  OTHER: "other",
} as const;

export type PrinterRole = (typeof PRINTER_ROLE)[keyof typeof PRINTER_ROLE];

export interface Printer {
  id: string;
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PrinterCreateInput {
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
}

export type PrinterUpdateInput = PrinterCreateInput;
