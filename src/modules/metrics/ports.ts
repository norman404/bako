import type { ResultAsync } from "neverthrow";

import type { MetricsPersistenceError } from "./errors";
import type { MetricsDateRange, SalesMetrics } from "./metrics";

export interface MetricsRepository {
  getSalesMetrics(range: MetricsDateRange): ResultAsync<SalesMetrics, MetricsPersistenceError>;
}
