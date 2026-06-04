import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DeliveryPersonCreateInput } from "@/modules/delivery/domain/ports";
import { deliveryPersonDrizzleRepository } from "@/modules/delivery/persistence/delivery-person-drizzle.repository";
import { createDeliveryPerson } from "@/modules/delivery/use-cases/create-delivery-person";
import { getTodayDeliveryCut } from "@/modules/delivery/use-cases/get-today-delivery-cut";
import { listDeliveryPersons } from "@/modules/delivery/use-cases/list-delivery-persons";

export const DELIVERY_PERSONS_QUERY_KEY = ["delivery-persons"] as const;
export const DELIVERY_PERSONS_CUT_QUERY_KEY = ["delivery-persons", "today-cut"] as const;

export function useDeliveryPersons() {
  return useQuery({
    queryKey: DELIVERY_PERSONS_QUERY_KEY,
    queryFn: async () => {
      const result = await listDeliveryPersons(deliveryPersonDrizzleRepository);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
  });
}

export function useCreateDeliveryPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeliveryPersonCreateInput) => {
      const result = await createDeliveryPerson(deliveryPersonDrizzleRepository, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DELIVERY_PERSONS_QUERY_KEY });
    },
  });
}

interface UpdateDeliveryPersonMutationInput {
  id: string;
  input: DeliveryPersonCreateInput;
}

export function useUpdateDeliveryPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateDeliveryPersonMutationInput) => {
      const result = await deliveryPersonDrizzleRepository.update(id, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DELIVERY_PERSONS_QUERY_KEY });
    },
  });
}

export function useArchiveDeliveryPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deliveryPersonDrizzleRepository.archive(id);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DELIVERY_PERSONS_QUERY_KEY });
    },
  });
}

export function useTodayDeliveryCut() {
  return useQuery({
    queryKey: DELIVERY_PERSONS_CUT_QUERY_KEY,
    queryFn: async () => {
      const result = await getTodayDeliveryCut(deliveryPersonDrizzleRepository);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    staleTime: 0,
  });
}
