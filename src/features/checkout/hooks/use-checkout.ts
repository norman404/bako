import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CHECKOUT_FULFILLMENT_TYPE,
  orderDrizzleRepository,
  type CheckoutCustomer,
  type CheckoutCustomerInput,
  type CheckoutFulfillmentType,
  type CreateOrderInput,
} from "@/features/checkout/persistence/order-drizzle.repository";

export const CHECKOUT_CUSTOMERS_QUERY_KEY = ["checkout", "customers"] as const;

export {
  CHECKOUT_FULFILLMENT_TYPE,
  type CheckoutCustomer,
  type CheckoutCustomerInput,
  type CheckoutFulfillmentType,
  type CreateOrderInput,
};

interface UseCustomersOptions {
  search?: string;
  enabled?: boolean;
}

export function useCustomers({ search = "", enabled = true }: UseCustomersOptions = {}) {
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: [...CHECKOUT_CUSTOMERS_QUERY_KEY, normalizedSearch],
    enabled,
    queryFn: async () => {
      const result = await orderDrizzleRepository.listCustomers(normalizedSearch);
      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const result = await orderDrizzleRepository.createOrder(input);
      if (result.isErr()) {
        throw result.error;
      }

      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHECKOUT_CUSTOMERS_QUERY_KEY });
    },
  });
}
