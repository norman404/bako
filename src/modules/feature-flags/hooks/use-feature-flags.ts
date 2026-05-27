import { useQuery } from "@tanstack/react-query";
import { listFeatureFlags } from "@/modules/feature-flags/use-cases/list-feature-flags";
import { featureFlagDrizzleRepository } from "@/modules/feature-flags/persistence/feature-flag-drizzle.repository";

export const FEATURE_FLAGS_QUERY_KEY = ["feature-flags"] as const;

export function useFeatureFlags() {
  return useQuery({
    queryKey: FEATURE_FLAGS_QUERY_KEY,
    queryFn: async () => {
      const result = await listFeatureFlags(featureFlagDrizzleRepository);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
  });
}
