export interface PrintCommandItemModifier {
  groupName: string;
  optionName: string | null;
  textValue: string | null;
}

export interface PrintCommandItem {
  name: string;
  quantity: number;
  modifiers: PrintCommandItemModifier[];
}

export interface PrintCommandDestination {
  printerType: string;
  printerAddress: string;
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelLanguage?: string;
  labelOrientation?: string;
}

export interface PrintCommandOptions {
  orderName: string | null;
  headerText: string;
  items: PrintCommandItem[];
  destination: PrintCommandDestination;
}
