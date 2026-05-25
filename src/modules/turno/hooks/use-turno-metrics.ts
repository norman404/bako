import { useQuery } from "@tanstack/react-query";

import { orderDrizzleRepository } from "@/modules/checkout/persistence/order-drizzle.repository";
import { getTodayMetrics } from "@/modules/checkout/use-cases/get-today-metrics";

export const TURNO_METRICS_QUERY_KEY = ["turno", "metrics", "today"] as const;

export type {
  PosMetrics as TurnoMetrics,
  PosMetricsPaymentBreakdown as TurnoMetricsPaymentBreakdown,
  PosMetricsTopProduct as TurnoMetricsTopProduct,
} from "@/modules/checkout/domain/metrics";

export function useTurnoMetrics() {
  return useQuery({
    queryKey: TURNO_METRICS_QUERY_KEY,
    queryFn: async () => {
      const result = await getTodayMetrics(orderDrizzleRepository);
      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
}
