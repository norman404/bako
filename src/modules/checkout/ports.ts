import type { ResultAsync } from "neverthrow";

import type { CheckoutOrder, CreateOrderInput } from "./order";
import type { CheckoutPersistenceError } from "./errors";

export interface OrderRepository {
  createOrder(input: CreateOrderInput): ResultAsync<CheckoutOrder, CheckoutPersistenceError>;
}
