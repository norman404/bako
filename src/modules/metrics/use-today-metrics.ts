import { useQuery } from "@tanstack/react-query";

import { getTodayMetrics } from "./get-today-metrics";
import { metricsDrizzleRepository } from "./repository";

const METRICS_QUERY_KEYS = {
  TODAY: ["metrics", "today"],
} as const;

export function useTodayMetrics() {
  return useQuery({
    queryKey: METRICS_QUERY_KEYS.TODAY,
    queryFn: async () => {
      const result = await getTodayMetrics(metricsDrizzleRepository);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    staleTime: 30_000,
  });
}

export { METRICS_QUERY_KEYS };
