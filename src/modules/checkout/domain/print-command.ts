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
}

export interface PrintCommandOptions {
  headerText: string;
  items: PrintCommandItem[];
  destination: PrintCommandDestination;
}
