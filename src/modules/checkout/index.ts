// Components
export { CheckoutModal } from "./components/CheckoutModal";

// Domain — print ticket
export type { PrintOrderOptions } from "./print-ticket";

// Adapters
export { printOrder } from "./print-ticket.adapter";
export { printCommand } from "./print-command.adapter";

// Hooks
export { useCreateOrder, type CreateOrderInput } from "./use-checkout";
export { usePrintCommands } from "./use-print-commands";

// Lib
export { buildKitchenCommands, type CartLine } from "./lib/build-kitchen-commands";
