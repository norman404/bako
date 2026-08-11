import type { ResultAsync } from "neverthrow";

import type { CheckoutPersistenceError } from "./errors";
import type { CheckoutOrder, CreateOrderInput } from "./order";
import type { OrderRepository } from "./ports";

export function createOrder(
  repository: OrderRepository,
  input: CreateOrderInput,
): ResultAsync<CheckoutOrder, CheckoutPersistenceError> {
  return repository.createOrder(input);
}
