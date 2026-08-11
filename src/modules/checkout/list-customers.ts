import type { ResultAsync } from "neverthrow";

import type { CheckoutPersistenceError } from "./errors";
import type { CheckoutCustomer } from "./order";
import type { OrderRepository } from "./ports";

export function listCustomers(
  repository: OrderRepository,
  search?: string,
): ResultAsync<CheckoutCustomer[], CheckoutPersistenceError> {
  return repository.listCustomers(search);
}
