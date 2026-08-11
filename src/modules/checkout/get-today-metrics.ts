import type { ResultAsync } from "neverthrow";

import type { CheckoutPersistenceError } from "./errors";
import type { PosMetrics } from "./metrics";
import type { OrderRepository } from "./ports";

export function getTodayMetrics(
  repository: OrderRepository,
): ResultAsync<PosMetrics, CheckoutPersistenceError> {
  return repository.getTodayMetrics();
}
