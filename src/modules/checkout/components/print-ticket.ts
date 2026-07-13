export { printOrder, testPrinter } from "@/modules/checkout/adapters/print-ticket.adapter";
export { printCommand } from "@/modules/checkout/adapters/print-command.adapter";
export {
  PRINT_TICKET_FULFILLMENT_TYPE,
  PRINT_TICKET_PAYMENT_METHOD,
  type PrintOrderCustomer,
  type PrintOrderItem,
  type PrintOrderOptions,
  type PrintTicketFulfillmentType,
  type PrintTicketPaymentMethod,
} from "@/modules/checkout/domain/print-ticket";
export {
  type PrintCommandDestination,
  type PrintCommandItem,
  type PrintCommandOptions,
} from "@/modules/checkout/domain/print-command";
