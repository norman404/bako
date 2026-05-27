import type { ResultAsync } from "neverthrow";

import type { FeatureFlag, FeatureFlagKey } from "@/modules/feature-flags/domain/feature-flag";
import type { FeatureFlagPersistenceError } from "@/modules/feature-flags/domain/errors";

export interface FeatureFlagRepository {
  list(): ResultAsync<FeatureFlag[], FeatureFlagPersistenceError>;
  update(key: FeatureFlagKey, value: boolean): ResultAsync<void, FeatureFlagPersistenceError>;
}
