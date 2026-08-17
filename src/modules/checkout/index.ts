// Components
export { CheckoutModal } from "./components/CheckoutModal";

// Domain — print ticket
export type { PrintOrderOptions, PrintOrderPayment } from "./print-ticket";

// Adapters
export { printOrder } from "./print-ticket.adapter";
export { printCommand } from "./print-command.adapter";

// Hooks
export {
  CHECKOUT_PAYMENT_METHOD,
  useCreateOrder,
  type CheckoutPaymentMethod,
  type CreateOrderInput,
} from "./use-checkout";
export {
  CHECKOUT_PAYMENT_MODE,
  buildPaymentInputs,
  calculatePaymentBreakdown,
  getPaymentValidationMessage,
  type CheckoutPaymentMode,
  type PaymentBreakdown,
} from "./lib/payment";
export { formatPaymentAmountInput, sanitizePaymentAmountInput } from "./lib/formatters";
export { usePrintCommands } from "./use-print-commands";

// Lib
export { buildKitchenCommands, type CartLine } from "./lib/build-kitchen-commands";
