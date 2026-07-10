export const PRINT_TICKET_FULFILLMENT_TYPE = {
  LOCAL: "local",
  DELIVERY: "delivery",
} as const;

export type PrintTicketFulfillmentType =
  (typeof PRINT_TICKET_FULFILLMENT_TYPE)[keyof typeof PRINT_TICKET_FULFILLMENT_TYPE];

export const PRINT_TICKET_PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
} as const;

export type PrintTicketPaymentMethod =
  (typeof PRINT_TICKET_PAYMENT_METHOD)[keyof typeof PRINT_TICKET_PAYMENT_METHOD];

export interface PrintOrderCustomer {
  name: string;
  phone: string;
  address: string;
}

export interface PrintOrderItemModifier {
  groupName: string;
  optionName: string | null;
  textValue: string | null;
}

export interface PrintOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: PrintOrderItemModifier[];
}

export interface PrintOrderOptions {
  ticketNumber: number;
  createdAt: Date;
  total: number;
  items: PrintOrderItem[];
  paymentMethod: PrintTicketPaymentMethod;
  paymentAmount: number;
  fulfillmentType: PrintTicketFulfillmentType;
  customer: PrintOrderCustomer | null;
}
