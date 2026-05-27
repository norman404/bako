import type { ResultAsync } from "neverthrow";

import type { FeatureFlagKey } from "@/modules/feature-flags/domain/feature-flag";
import type { FeatureFlagPersistenceError } from "@/modules/feature-flags/domain/errors";
import type { FeatureFlagRepository } from "@/modules/feature-flags/domain/ports";

export function updateFeatureFlag(
  repository: FeatureFlagRepository,
  key: FeatureFlagKey,
  value: boolean,
): ResultAsync<void, FeatureFlagPersistenceError> {
  return repository.update(key, value);
}
