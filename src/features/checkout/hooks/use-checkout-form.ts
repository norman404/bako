import { useState } from "react";

import {
  CHECKOUT_FULFILLMENT_TYPE,
  useCustomers,
  type CheckoutCustomer,
  type CheckoutFulfillmentType,
  type CreateOrderInput,
} from "@/features/checkout/hooks/use-checkout";
import {
  buildCreateOrderInput,
  buildCustomerFormState,
  buildEmptyCustomerFormState,
  CHECKOUT_PAYMENT_METHOD,
  getPaymentValidationMessage,
  type CheckoutCustomerFormState,
  type CheckoutPaymentMethod,
} from "@/features/checkout/lib/builders";
import {
  formatPaymentAmountInput,
  parsePaymentAmountInput,
  sanitizePaymentAmountInput,
} from "@/features/checkout/lib/formatters";
import { calculateCartTotals, type CartItem } from "@/features/order/domain/cart";

const CHECKOUT_CUSTOMER_ENTRY_MODE = {
  SEARCH: "search",
  NEW: "new",
} as const;

type CustomerEntryMode =
  (typeof CHECKOUT_CUSTOMER_ENTRY_MODE)[keyof typeof CHECKOUT_CUSTOMER_ENTRY_MODE];

interface UseCheckoutFormOptions {
  open: boolean;
  items: CartItem[];
  totals?: ReturnType<typeof calculateCartTotals>;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirmCheckout: (input: CreateOrderInput) => Promise<void>;
}

export function computeReceivedAmount(
  paymentMethod: CheckoutPaymentMethod,
  cashAmountInput: string,
  total: number,
): number | null {
  if (paymentMethod === CHECKOUT_PAYMENT_METHOD.CARD) {
    return total;
  }

  return parsePaymentAmountInput(cashAmountInput);
}

export function computeChangeAmount(
  paymentMethod: CheckoutPaymentMethod,
  cashAmountInput: string,
  total: number,
): number | null {
  if (paymentMethod === CHECKOUT_PAYMENT_METHOD.CARD) {
    return null;
  }

  const receivedAmount = computeReceivedAmount(paymentMethod, cashAmountInput, total);
  if (receivedAmount === null) {
    return null;
  }

  return Math.max(receivedAmount - total, 0);
}

export function computeIsDisabled(
  items: CartItem[],
  isSubmitting: boolean,
  paymentValidationMessage: string | null,
): boolean {
  return items.length === 0 || isSubmitting || paymentValidationMessage !== null;
}

export function useCheckoutForm({
  open,
  items,
  totals,
  isSubmitting = false,
  onClose,
  onConfirmCheckout,
}: UseCheckoutFormOptions) {
  const normalizedTotals = totals ?? calculateCartTotals(items);

  const [fulfillmentType, setFulfillmentType] = useState<CheckoutFulfillmentType>(
    CHECKOUT_FULFILLMENT_TYPE.LOCAL,
  );
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>(
    CHECKOUT_PAYMENT_METHOD.CASH,
  );
  const [cashAmountInput, setCashAmountInput] = useState(() =>
    formatPaymentAmountInput(normalizedTotals.total),
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerMode, setCustomerMode] = useState<CustomerEntryMode>(
    CHECKOUT_CUSTOMER_ENTRY_MODE.SEARCH,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CheckoutCustomerFormState>(() =>
    buildEmptyCustomerFormState(),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const isDelivery = fulfillmentType === CHECKOUT_FULFILLMENT_TYPE.DELIVERY;
  const isSearchCustomerMode = customerMode === CHECKOUT_CUSTOMER_ENTRY_MODE.SEARCH;
  const isNewCustomerMode = customerMode === CHECKOUT_CUSTOMER_ENTRY_MODE.NEW;
  const isCashPayment = paymentMethod === CHECKOUT_PAYMENT_METHOD.CASH;
  const paymentValidationMessage = getPaymentValidationMessage(
    paymentMethod,
    cashAmountInput,
    normalizedTotals.total,
  );
  const receivedAmount = computeReceivedAmount(paymentMethod, cashAmountInput, normalizedTotals.total);
  const registeredPaymentAmount = isCashPayment ? receivedAmount : normalizedTotals.total;
  const changeAmount = computeChangeAmount(paymentMethod, cashAmountInput, normalizedTotals.total);
  const isDisabled = computeIsDisabled(items, isSubmitting, paymentValidationMessage);
  const customerQuery = useCustomers({
    search: customerSearch,
    enabled: open && isDelivery && isSearchCustomerMode,
  });
  const customerOptions = customerQuery.data ?? [];
  const trimmedCustomerSearch = customerSearch.trim();
  const customerSectionLabel = trimmedCustomerSearch.length > 0 ? "Resultados" : "Clientes guardados";

  const handleCloseRequest = () => {
    if (isSubmitting) {
      return;
    }

    setFormError(null);
    onClose();
  };

  const handleFulfillmentChange = (nextType: CheckoutFulfillmentType) => {
    setFulfillmentType(nextType);
    setFormError(null);
  };

  const handlePaymentMethodChange = (nextMethod: CheckoutPaymentMethod) => {
    setPaymentMethod(nextMethod);
    setFormError(null);

    if (nextMethod === CHECKOUT_PAYMENT_METHOD.CASH && cashAmountInput.trim().length === 0) {
      setCashAmountInput(formatPaymentAmountInput(normalizedTotals.total));
    }
  };

  const handleSelectCustomer = (customer: CheckoutCustomer) => {
    setCustomerMode(CHECKOUT_CUSTOMER_ENTRY_MODE.SEARCH);
    setSelectedCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setFormError(null);
    setCustomerForm(buildCustomerFormState(customer));
  };

  const handleShowSearchCustomers = () => {
    setCustomerMode(CHECKOUT_CUSTOMER_ENTRY_MODE.SEARCH);
    setFormError(null);
  };

  const handleStartNewCustomer = () => {
    setCustomerMode(CHECKOUT_CUSTOMER_ENTRY_MODE.NEW);
    setSelectedCustomerId(null);
    setCustomerSearch("");
    setFormError(null);
    setCustomerForm(buildEmptyCustomerFormState());
  };

  const handleCustomerFieldChange = (
    field: keyof CheckoutCustomerFormState,
    value: string,
  ) => {
    setSelectedCustomerId(null);
    setFormError(null);
    setCustomerForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCashInputChange = (value: string) => {
    setFormError(null);
    setCashAmountInput(sanitizePaymentAmountInput(value));
  };

  const handleCustomerSearchChange = (value: string) => {
    setFormError(null);
    setSelectedCustomerId(null);
    setCustomerSearch(value);
  };

  const handleConfirm = async () => {
    if (isDisabled) {
      return;
    }

    const payload = buildCreateOrderInput(
      items,
      fulfillmentType,
      selectedCustomerId,
      customerForm,
      paymentMethod,
      cashAmountInput,
      normalizedTotals.total,
    );
    if (!payload) {
      setFormError(
        paymentValidationMessage ??
          (isDelivery
            ? isNewCustomerMode
              ? "Para delivery necesitás cliente, teléfono y dirección."
              : 'Elegí un cliente guardado o tocá "Nuevo cliente" para cargar uno.'
            : "Agregá al menos un producto antes de cobrar."),
      );
      return;
    }

    try {
      setFormError(null);
      await onConfirmCheckout(payload);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos guardar el pedido");
    }
  };

  return {
    fulfillmentType,
    paymentMethod,
    cashAmountInput,
    customerSearch,
    customerMode,
    selectedCustomerId,
    customerForm,
    formError,
    isDelivery,
    isSearchCustomerMode,
    isNewCustomerMode,
    isCashPayment,
    paymentValidationMessage,
    receivedAmount,
    registeredPaymentAmount,
    changeAmount,
    isDisabled,
    customerQuery,
    customerOptions,
    trimmedCustomerSearch,
    customerSectionLabel,
    handleCloseRequest,
    handleFulfillmentChange,
    handlePaymentMethodChange,
    handleSelectCustomer,
    handleShowSearchCustomers,
    handleStartNewCustomer,
    handleCustomerFieldChange,
    handleCashInputChange,
    handleCustomerSearchChange,
    handleConfirm,
  };
}
