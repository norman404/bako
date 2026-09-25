import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { METRICS_QUERY_KEYS } from "@/modules/metrics";
import { confirmDelivery, listPendingDeliveries } from "./delivery-repository";
import type { ConfirmDeliveryInput } from "./delivery";

export function usePendingDeliveries() {
  return useQuery({
    queryKey: ["shift", "delivery", "pending"],
    queryFn: listPendingDeliveries,
    staleTime: 10_000,
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: ConfirmDeliveryInput }) => confirmDelivery(orderId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shift"] }),
        queryClient.invalidateQueries({ queryKey: METRICS_QUERY_KEYS.SALES }),
      ]);
    },
  });
}
