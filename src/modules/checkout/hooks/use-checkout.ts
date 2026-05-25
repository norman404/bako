import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CHECKOUT_FULFILLMENT_TYPE,
  type CheckoutCustomer,
  type CheckoutCustomerInput,
  type CheckoutFulfillmentType,
  type CreateOrderInput,
} from "@/modules/checkout/domain/order";
import { orderDrizzleRepository } from "@/modules/checkout/persistence/order-drizzle.repository";
import { createOrder } from "@/modules/checkout/use-cases/create-order";
import { listCustomers } from "@/modules/checkout/use-cases/list-customers";

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
      const result = await listCustomers(orderDrizzleRepository, normalizedSearch);
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
      const result = await createOrder(orderDrizzleRepository, input);
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
