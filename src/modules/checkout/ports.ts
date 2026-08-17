import type { ResultAsync } from "neverthrow";

import type { CheckoutCustomer, CheckoutOrder, CreateOrderInput } from "./order";
import type { CheckoutPersistenceError } from "./errors";

export interface OrderRepository {
  createOrder(input: CreateOrderInput): ResultAsync<CheckoutOrder, CheckoutPersistenceError>;
  listCustomers(search?: string): ResultAsync<CheckoutCustomer[], CheckoutPersistenceError>;
}
