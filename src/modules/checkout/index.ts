// Components
export { CheckoutModal } from "./components/CheckoutModal";

// Domain — print ticket
export {
  PRINT_TICKET_FULFILLMENT_TYPE,
  PRINT_TICKET_PAYMENT_METHOD,
  type PrintOrderCustomer,
  type PrintOrderItem,
  type PrintOrderOptions,
  type PrintTicketFulfillmentType,
  type PrintTicketPaymentMethod,
} from "./print-ticket";

// Domain — print command
export type {
  PrintCommandDestination,
  PrintCommandItem,
  PrintCommandOptions,
} from "./print-command";

// Adapters
export { printOrder, testPrinter } from "./print-ticket.adapter";
export { printCommand } from "./print-command.adapter";

// Hooks
export { useCreateOrder, type CreateOrderInput } from "./use-checkout";
export { usePrintCommands } from "./use-print-commands";

// Lib
export { buildKitchenCommands, type CartLine } from "./lib/build-kitchen-commands";
