import type { ResultAsync } from "neverthrow";

import type { CheckoutPersistenceError } from "@/modules/checkout/domain/errors";
import type { CheckoutCustomer } from "@/modules/checkout/domain/order";
import type { OrderRepository } from "@/modules/checkout/domain/ports";

export function listCustomers(
  repository: OrderRepository,
  search?: string,
): ResultAsync<CheckoutCustomer[], CheckoutPersistenceError> {
  return repository.listCustomers(search);
}
