import { useQuery } from "@tanstack/react-query";

import { orderDrizzleRepository } from "@/features/checkout/persistence/order-drizzle.repository";

export const TURNO_METRICS_QUERY_KEY = ["turno", "metrics", "today"] as const;

export type {
  PosMetrics as TurnoMetrics,
  PosMetricsPaymentBreakdown as TurnoMetricsPaymentBreakdown,
  PosMetricsTopProduct as TurnoMetricsTopProduct,
} from "@/features/checkout/persistence/order-drizzle.repository";

export function useTurnoMetrics() {
  return useQuery({
    queryKey: TURNO_METRICS_QUERY_KEY,
    queryFn: async () => {
      const result = await orderDrizzleRepository.getTodayPosMetrics();
      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
}
