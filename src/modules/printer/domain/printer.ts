export const PRINTER_TYPE = {
  USB: "usb",
  NETWORK: "network",
  LABEL: "label",
} as const;

export type PrinterType = (typeof PRINTER_TYPE)[keyof typeof PRINTER_TYPE];

export const PRINTER_ROLE = {
  RECEIPT: "receipt",
  COMANDA: "comanda",
} as const;

export type PrinterRole = (typeof PRINTER_ROLE)[keyof typeof PRINTER_ROLE];

export const PRINTER_LABEL_LANGUAGE = {
  TSPL: "tspl",
  ZPL: "zpl",
  EPL: "epl",
  CPCL: "cpcl",
} as const;

export type LabelLanguage = (typeof PRINTER_LABEL_LANGUAGE)[keyof typeof PRINTER_LABEL_LANGUAGE];

export const PRINTER_ORIENTATION = {
  LANDSCAPE: "landscape",
  PORTRAIT: "portrait",
} as const;

export type PrinterOrientation = (typeof PRINTER_ORIENTATION)[keyof typeof PRINTER_ORIENTATION];

export interface Printer {
  id: string;
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
  isDefault: boolean;
  labelWidthMm: number;
  labelHeightMm: number;
  labelGapMm: number;
  labelLanguage: LabelLanguage;
  labelOrientation: PrinterOrientation;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const DEFAULT_LABEL_LANGUAGE: LabelLanguage = PRINTER_LABEL_LANGUAGE.TSPL;
export const DEFAULT_LABEL_ORIENTATION: PrinterOrientation = PRINTER_ORIENTATION.LANDSCAPE;

export interface PrinterCreateInput {
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
  isDefault?: boolean;
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelLanguage?: LabelLanguage;
  labelOrientation?: PrinterOrientation;
}

export type PrinterUpdateInput = PrinterCreateInput;

export function isLabelLanguage(value: string): value is LabelLanguage {
  return Object.values(PRINTER_LABEL_LANGUAGE).includes(value as LabelLanguage);
}

export function isPrinterOrientation(value: string): value is PrinterOrientation {
  return Object.values(PRINTER_ORIENTATION).includes(value as PrinterOrientation);
}
