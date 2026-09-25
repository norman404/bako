import type { ResultAsync } from "neverthrow";

import type { MetricsPersistenceError } from "./errors";
import type { MetricsDateRange, SalesMetrics } from "./metrics";
import type { MetricsRepository } from "./ports";

export function getSalesMetrics(
  repository: MetricsRepository,
  range: MetricsDateRange,
): ResultAsync<SalesMetrics, MetricsPersistenceError> {
  return repository.getSalesMetrics(range);
}
