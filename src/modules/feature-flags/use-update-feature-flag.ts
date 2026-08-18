import { useMutation } from "@tanstack/react-query";
import type { FeatureFlagKey } from "./feature-flag";
import { useFeatureFlagsStore } from "./feature-flags-store";

interface UpdateFeatureFlagInput {
  key: FeatureFlagKey;
  value: boolean;
}

export function useUpdateFeatureFlag() {
  return useMutation({
    mutationFn: async ({ key, value }: UpdateFeatureFlagInput) => {
      const result = await useFeatureFlagsStore.getState().setFlag(key, value);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
  });
}
