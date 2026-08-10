import type { ResultAsync } from "neverthrow";

import type { FeatureFlagKey } from "./feature-flag";
import type { FeatureFlagPersistenceError } from "./errors";
import type { FeatureFlagRepository } from "./ports";

export function updateFeatureFlag(
  repository: FeatureFlagRepository,
  key: FeatureFlagKey,
  value: boolean,
): ResultAsync<void, FeatureFlagPersistenceError> {
  return repository.update(key, value);
}
