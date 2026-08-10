import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FeatureFlagKey } from "./feature-flag";
import { updateFeatureFlag } from "./update-feature-flag";
import { featureFlagDrizzleRepository } from "./repository";
import { useFeatureFlagsStore } from "./feature-flags-store";
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
