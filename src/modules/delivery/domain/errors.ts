export class DeliveryPersonError extends Error {
  readonly kind = "DeliveryPersonError";
}

export class DeliveryPersonNotFoundError extends DeliveryPersonError {
  constructor(deliveryPersonId: string) {
    super(`Delivery person not found: ${deliveryPersonId}`);
  }
}
