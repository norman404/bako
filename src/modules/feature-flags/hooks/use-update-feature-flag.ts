import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FeatureFlagKey } from "@/modules/feature-flags/domain/feature-flag";
import { updateFeatureFlag } from "@/modules/feature-flags/use-cases/update-feature-flag";
import { featureFlagDrizzleRepository } from "@/modules/feature-flags/persistence/feature-flag-drizzle.repository";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { FEATURE_FLAGS_QUERY_KEY } from "./use-feature-flags";

interface UpdateFeatureFlagInput {
  key: FeatureFlagKey;
  value: boolean;
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: UpdateFeatureFlagInput) => {
      // Optimistic update in Zustand store for immediate UI reaction
      const previousValue = useFeatureFlagsStore.getState().flags[key];
      useFeatureFlagsStore.getState().setFlag(key, value);

      const result = await updateFeatureFlag(featureFlagDrizzleRepository, key, value);
      if (result.isErr()) {
        // Rollback on error
        useFeatureFlagsStore.getState().setFlag(key, previousValue);
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_QUERY_KEY });
    },
  });
}
