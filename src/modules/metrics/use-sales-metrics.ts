import { useQuery } from "@tanstack/react-query";

import { getSalesMetrics } from "./get-sales-metrics";
import { metricsDrizzleRepository } from "./repository";

export const METRICS_QUERY_KEYS = { SALES: ["metrics", "sales"] } as const;

export function useSalesMetrics(start: Date, end: Date) {
  return useQuery({
    queryKey: [...METRICS_QUERY_KEYS.SALES, start.getTime(), end.getTime()],
    queryFn: async () => {
      const result = await getSalesMetrics(metricsDrizzleRepository, { start, end });
      if (result.isErr()) throw result.error;
      return result.value;
    },
    staleTime: 30_000,
  });
}
