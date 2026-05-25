export class CheckoutPersistenceError extends Error {
  readonly kind = "CheckoutPersistenceError";

  constructor(message: string) {
    super(message);
    this.name = "CheckoutPersistenceError";
  }
}
