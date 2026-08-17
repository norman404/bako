import { useMutation } from "@tanstack/react-query";

import { orderDrizzleRepository } from "./repository";
import { createOrder } from "./create-order";
import type { CreateOrderInput } from "./order";

export { CHECKOUT_PAYMENT_METHOD, type CheckoutPaymentMethod } from "./order";
export type { CreateOrderInput } from "./order";

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const result = await createOrder(orderDrizzleRepository, input);
      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
  });
}
