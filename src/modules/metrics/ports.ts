import type { ResultAsync } from "neverthrow";

import type { MetricsPersistenceError } from "./errors";
import type { TodayMetrics } from "./metrics";

export interface MetricsRepository {
  getTodayMetrics(): ResultAsync<TodayMetrics, MetricsPersistenceError>;
}
