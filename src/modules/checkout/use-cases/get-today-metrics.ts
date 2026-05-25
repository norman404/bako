import type { ResultAsync } from "neverthrow";

import type { CheckoutPersistenceError } from "@/modules/checkout/domain/errors";
import type { PosMetrics } from "@/modules/checkout/domain/metrics";
import type { OrderRepository } from "@/modules/checkout/ports";

export function getTodayMetrics(
  repository: OrderRepository,
): ResultAsync<PosMetrics, CheckoutPersistenceError> {
  return repository.getTodayMetrics();
}
