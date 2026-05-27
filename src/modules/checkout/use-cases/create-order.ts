import type { ResultAsync } from "neverthrow";

import type { CheckoutPersistenceError } from "@/modules/checkout/domain/errors";
import type { CheckoutOrder, CreateOrderInput } from "@/modules/checkout/domain/order";
import type { OrderRepository } from "@/modules/checkout/domain/ports";

export function createOrder(
  repository: OrderRepository,
  input: CreateOrderInput,
): ResultAsync<CheckoutOrder, CheckoutPersistenceError> {
  return repository.createOrder(input);
}
