import type { ResultAsync } from "neverthrow";

import type { MetricsPersistenceError } from "./errors";
import type { TodayMetrics } from "./metrics";
import type { MetricsRepository } from "./ports";

export function getTodayMetrics(
  repository: MetricsRepository,
): ResultAsync<TodayMetrics, MetricsPersistenceError> {
  return repository.getTodayMetrics();
}
