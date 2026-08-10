import type { ResultAsync } from "neverthrow";

import type { FeatureFlag } from "./feature-flag";
import type { FeatureFlagPersistenceError } from "./errors";
import type { FeatureFlagRepository } from "./ports";

export function listFeatureFlags(
  repository: FeatureFlagRepository,
): ResultAsync<FeatureFlag[], FeatureFlagPersistenceError> {
  return repository.list();
}
