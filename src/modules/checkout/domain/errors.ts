export type CheckoutErrorCode =
  | "customerNameRequired"
  | "customerPhoneRequired"
  | "customerAddressRequired"
  | "invalidPaymentMethod"
  | "invalidPaymentAmount"
  | "insufficientPaymentAmount"
  | "cardPaymentExactMatchRequired"
  | "orderItemsRequired"
  | "orderItemProductIdRequired"
  | "orderItemQuantityInvalid"
  | "orderItemUnitPriceInvalid"
  | "customerIdAndCustomerConflict"
  | "localOrderCustomerForbidden"
  | "localOrderDeliveryPersonForbidden"
  | "deliveryOrderCustomerRequired"
  | "customerNotFound"
  | "dbError";

export interface CheckoutTranslatableError {
  readonly code: CheckoutErrorCode;
  readonly params?: Record<string, unknown>;
}

export class CheckoutPersistenceError extends Error implements CheckoutTranslatableError {
  readonly kind = "CheckoutPersistenceError";
  readonly code: CheckoutErrorCode;
  readonly params?: Record<string, unknown>;

  constructor(code: CheckoutErrorCode, params?: Record<string, unknown>, message?: string) {
    super(message ?? `${code}: ${params ? JSON.stringify(params) : ""}`.trim());
    this.name = "CheckoutPersistenceError";
    this.code = code;
    this.params = params;
  }
}
