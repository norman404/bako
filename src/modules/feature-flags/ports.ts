import type { ResultAsync } from "neverthrow";

import type { FeatureFlag, FeatureFlagKey } from "./feature-flag";
import type { FeatureFlagPersistenceError } from "./errors";

export interface FeatureFlagRepository {
  list(): ResultAsync<FeatureFlag[], FeatureFlagPersistenceError>;
  update(key: FeatureFlagKey, value: boolean): ResultAsync<void, FeatureFlagPersistenceError>;
}
