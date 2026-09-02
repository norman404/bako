import { useMutation, useQueryClient } from "@tanstack/react-query";

import { METRICS_QUERY_KEYS } from "@/modules/metrics";

import { orderDrizzleRepository } from "./repository";
import { createOrder } from "./create-order";
import type { CreateOrderInput } from "./order";

export { CHECKOUT_PAYMENT_METHOD, type CheckoutPaymentMethod } from "./order";
export type { CreateOrderInput } from "./order";

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const result = await createOrder(orderDrizzleRepository, input);
      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: METRICS_QUERY_KEYS.SALES });
    },
  });
}
