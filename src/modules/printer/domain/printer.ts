export const PRINTER_TYPE = {
  USB: "usb",
  NETWORK: "network",
  LABEL: "label",
} as const;

export type PrinterType = (typeof PRINTER_TYPE)[keyof typeof PRINTER_TYPE];

export const PRINTER_ROLE = {
  RECEIPT: "receipt",
  KITCHEN: "kitchen",
  BAR: "bar",
  OTHER: "other",
} as const;

export type PrinterRole = (typeof PRINTER_ROLE)[keyof typeof PRINTER_ROLE];

export const PRINTER_LABEL_LANGUAGE = {
  TSPL: "tspl",
  ZPL: "zpl",
  EPL: "epl",
  CPCL: "cpcl",
} as const;

export type LabelLanguage = (typeof PRINTER_LABEL_LANGUAGE)[keyof typeof PRINTER_LABEL_LANGUAGE];

export interface Printer {
  id: string;
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
  labelWidthMm: number;
  labelHeightMm: number;
  labelGapMm: number;
  labelLanguage: LabelLanguage;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const DEFAULT_LABEL_LANGUAGE: LabelLanguage = PRINTER_LABEL_LANGUAGE.TSPL;

export interface PrinterCreateInput {
  name: string;
  type: PrinterType;
  address: string;
  role: PrinterRole;
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelLanguage?: LabelLanguage;
}

export type PrinterUpdateInput = PrinterCreateInput;

export function isLabelLanguage(value: string): value is LabelLanguage {
  return Object.values(PRINTER_LABEL_LANGUAGE).includes(value as LabelLanguage);
}
