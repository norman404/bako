export interface DeliveryTranslatableError {
  readonly code: string;
  readonly params?: Record<string, unknown>;
}

export class DeliveryPersonError extends Error implements DeliveryTranslatableError {
  readonly kind = "DeliveryPersonError";
  readonly code: string;
  readonly params?: Record<string, unknown>;

  constructor(code: string, params?: Record<string, unknown>, message?: string) {
    super(message ?? `${code}: ${params ? JSON.stringify(params) : ""}`.trim());
    this.name = "DeliveryPersonError";
    this.code = code;
    this.params = params;
  }
}

export class DeliveryPersonNotFoundError extends DeliveryPersonError {
  constructor(deliveryPersonId: string) {
    super("deliveryPersonNotFound", { deliveryPersonId }, `Delivery person not found: ${deliveryPersonId}`);
  }
}
