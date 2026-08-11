import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { shiftDrizzleRepository } from "./repository";
import { getOrderDetail } from "./get-order-detail";
import { voidOrder } from "./void-order";
import { updateOrder } from "./update-order";
import type { UpdateOrderInput } from "./order-management";

export const ORDER_QUERY_KEYS = {
  detail: (orderId: string) => ["shift", "order", orderId] as const,
};

async function orderDetailQueryFn(orderId: string) {
  const result = await getOrderDetail(shiftDrizzleRepository, orderId);
  if (result.isErr()) throw result.error;
  return result.value;
}

export function useOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.detail(orderId ?? ""),
    enabled: !!orderId,
    queryFn: () => {
      if (!orderId) throw new Error("Order ID is required");
      return orderDetailQueryFn(orderId);
    },
    staleTime: 30_000,
  });
}

/**
 * Imperative fetch for OrderDetail — for components that need to trigger a
 * fetch on a user action (e.g. a button click) rather than reactively via
 * render. Shares the query cache entry with `useOrderDetail` (same query key),
 * so components must never import `shiftDrizzleRepository` directly.
 */
export function useFetchOrderDetail() {
  const queryClient = useQueryClient();
  return (orderId: string) =>
    queryClient.fetchQuery({
      queryKey: ORDER_QUERY_KEYS.detail(orderId),
      queryFn: () => orderDetailQueryFn(orderId),
      staleTime: 30_000,
    });
}

export function useVoidOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const result = await voidOrder(shiftDrizzleRepository, orderId);
      if (result.isErr()) throw result.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shift"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, input }: { orderId: string; input: UpdateOrderInput }) => {
      const result = await updateOrder(shiftDrizzleRepository, orderId, input);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["shift"] });
      await queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(data.id) });
    },
  });
}
