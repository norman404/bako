import type { ResultAsync } from "neverthrow";

import type { CheckoutCustomer, CheckoutOrder, CreateOrderInput } from "./domain/order";
import type { PosMetrics } from "./domain/metrics";
import type { CheckoutPersistenceError } from "./domain/errors";

export interface OrderRepository {
  createOrder(input: CreateOrderInput): ResultAsync<CheckoutOrder, CheckoutPersistenceError>;
  listCustomers(search?: string): ResultAsync<CheckoutCustomer[], CheckoutPersistenceError>;
  getTodayMetrics(): ResultAsync<PosMetrics, CheckoutPersistenceError>;
}
