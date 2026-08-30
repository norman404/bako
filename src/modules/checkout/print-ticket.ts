export const PRINT_TICKET_PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
} as const;

export type PrintTicketPaymentMethod =
  (typeof PRINT_TICKET_PAYMENT_METHOD)[keyof typeof PRINT_TICKET_PAYMENT_METHOD];

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

export interface PrintOrderPayment {
  method: PrintTicketPaymentMethod;
  amount: number;
  cashReceived: number | null;
}

export interface PrintOrderOptions {
  orderName: string | null;
  ticketNumber: number;
  createdAt: Date;
  total: number;
  items: PrintOrderItem[];
  payments: PrintOrderPayment[];
}
