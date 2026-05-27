import type { ResultAsync } from "neverthrow";

import type { FeatureFlag } from "@/modules/feature-flags/domain/feature-flag";
import type { FeatureFlagPersistenceError } from "@/modules/feature-flags/domain/errors";
import type { FeatureFlagRepository } from "@/modules/feature-flags/domain/ports";

export function listFeatureFlags(
  repository: FeatureFlagRepository,
): ResultAsync<FeatureFlag[], FeatureFlagPersistenceError> {
  return repository.list();
}
