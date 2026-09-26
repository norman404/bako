import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResultAsync } from "neverthrow";

import type { PromotionInput } from "./promotion-form";
import { promotionRepository } from "./repository";

export const PROMOTIONS_QUERY_KEY = ["promotions"] as const;

async function unwrap<T, E>(operation: ResultAsync<T, E>): Promise<T> {
  const result = await operation;
  if (result.isErr()) throw result.error;
  return result.value;
}

interface UsePromotionsOptions {
  enabled?: boolean;
}

export function usePromotions(options: UsePromotionsOptions = {}) {
  return useQuery({
    queryKey: PROMOTIONS_QUERY_KEY,
    queryFn: () => unwrap(promotionRepository.list()),
    enabled: options.enabled ?? true,
  });
}

function useInvalidatingMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROMOTIONS_QUERY_KEY });
    },
  });
}

export function useSavePromotion() {
  return useInvalidatingMutation(({ id, input }: { id: string | null; input: PromotionInput }) =>
    id === null ? unwrap(promotionRepository.create(input)) : unwrap(promotionRepository.update(id, input)),
  );
}

export function useTogglePromotion() {
  return useInvalidatingMutation(({ id, isActive }: { id: string; isActive: boolean }) =>
    unwrap(promotionRepository.setActive(id, isActive)),
  );
}

export function useArchivePromotion() {
  return useInvalidatingMutation((id: string) => unwrap(promotionRepository.archive(id)));
}
