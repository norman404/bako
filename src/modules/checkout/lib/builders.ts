import type {
  CheckoutCustomer,
  CheckoutCustomerInput,
  CheckoutFulfillmentType,
  CreateOrderInput,
} from "@/modules/checkout/hooks/use-checkout";
import { parsePaymentAmountInput } from "@/modules/checkout/lib/formatters";
import type { CartItem } from "@/modules/order/domain/cart";
import { formatPosCurrency } from "@/lib/currency";

export interface CheckoutCustomerFormState {
  name: string;
  phone: string;
  address: string;
}

export const CHECKOUT_PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
} as const;

export type CheckoutPaymentMethod =
  (typeof CHECKOUT_PAYMENT_METHOD)[keyof typeof CHECKOUT_PAYMENT_METHOD];

const CHECKOUT_LOCAL_FULFILLMENT_TYPE = "local";

function buildOrderItemsInput(items: CartItem[]): CreateOrderInput["items"] {
  return items.map((item) => ({
    productId: item.product.id,
    quantity: item.quantity,
    unitPrice: item.product.price,
  }));
}

export function buildEmptyCustomerFormState(): CheckoutCustomerFormState {
  return {
    name: "",
    phone: "",
    address: "",
  };
}

export function buildCustomerFormState(customer: CheckoutCustomer): CheckoutCustomerFormState {
  return {
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
  };
}

export function buildCustomerInput(
  formState: CheckoutCustomerFormState,
): CheckoutCustomerInput | null {
  const name = formState.name.trim();
  const phone = formState.phone.trim();
  const address = formState.address.trim();

  if (name.length === 0 || phone.length === 0 || address.length === 0) {
    return null;
  }

  return {
    name,
    phone,
    address,
  };
}

export function getPaymentValidationMessage(
  paymentMethod: CheckoutPaymentMethod,
  cashAmountInput: string,
  total: number,
): string | null {
  if (paymentMethod === CHECKOUT_PAYMENT_METHOD.CARD) {
    return null;
  }

  if (cashAmountInput.trim().length === 0) {
    return "Ingresá el monto recibido en efectivo.";
  }

  const receivedAmount = parsePaymentAmountInput(cashAmountInput);
  if (receivedAmount === null) {
    return "Ingresá un monto válido en efectivo.";
  }

  if (receivedAmount < total) {
    return `El efectivo recibido debe cubrir ${formatPosCurrency(total)}.`;
  }

  return null;
}

export function buildPaymentInput(
  paymentMethod: CheckoutPaymentMethod,
  cashAmountInput: string,
  total: number,
): CreateOrderInput["payment"] | null {
  if (paymentMethod === CHECKOUT_PAYMENT_METHOD.CARD) {
    return {
      method: CHECKOUT_PAYMENT_METHOD.CARD,
      amount: total,
    };
  }

  const receivedAmount = parsePaymentAmountInput(cashAmountInput);
  if (receivedAmount === null || receivedAmount < total) {
    return null;
  }

  return {
    method: CHECKOUT_PAYMENT_METHOD.CASH,
    amount: receivedAmount,
  };
}

export function buildCreateOrderInput(
  items: CartItem[],
  fulfillmentType: CheckoutFulfillmentType,
  selectedCustomerId: string | null,
  customerForm: CheckoutCustomerFormState,
  paymentMethod: CheckoutPaymentMethod,
  cashAmountInput: string,
  total: number,
): CreateOrderInput | null {
  if (items.length === 0) {
    return null;
  }

  const payment = buildPaymentInput(paymentMethod, cashAmountInput, total);
  if (!payment) {
    return null;
  }

  const normalizedItems = buildOrderItemsInput(items);

  if (fulfillmentType === CHECKOUT_LOCAL_FULFILLMENT_TYPE) {
    return {
      items: normalizedItems,
      fulfillmentType,
      payment,
    };
  }

  if (selectedCustomerId) {
    return {
      items: normalizedItems,
      fulfillmentType,
      customerId: selectedCustomerId,
      payment,
    };
  }

  const customer = buildCustomerInput(customerForm);
  if (!customer) {
    return null;
  }

  return {
    items: normalizedItems,
    fulfillmentType,
    customer,
    payment,
  };
}
