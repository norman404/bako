export const PRINT_COMMAND_FULFILLMENT_TYPE = {
  LOCAL: "local",
  DELIVERY: "delivery",
} as const;

export type PrintCommandFulfillmentType =
  (typeof PRINT_COMMAND_FULFILLMENT_TYPE)[keyof typeof PRINT_COMMAND_FULFILLMENT_TYPE];

export interface PrintCommandCustomer {
  name: string;
  phone: string;
  address: string;
}

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
  ticketNumber: number;
  createdAt: Date;
  items: PrintCommandItem[];
  fulfillmentType: PrintCommandFulfillmentType;
  customer: PrintCommandCustomer | null;
  destination: PrintCommandDestination;
}
