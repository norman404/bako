import { eq } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

import type { FeatureFlag, FeatureFlagKey } from "@/modules/feature-flags/domain/feature-flag";
import { FeatureFlagPersistenceError } from "@/modules/feature-flags/domain/errors";
import type { FeatureFlagRepository } from "@/modules/feature-flags/domain/ports";
import { db } from "@/shared/db/client";
import { featureFlags, type FeatureFlagRow } from "@/shared/db/schema";

function wrapDbError(context: string) {
  return (cause: unknown) => new FeatureFlagPersistenceError(`${context}: ${String(cause)}`);
}

function rowToDomain(row: FeatureFlagRow): FeatureFlag {
  return {
    key: row.key as FeatureFlagKey,
    value: row.value === "true",
    updatedAt: row.updatedAt,
  };
}

export const featureFlagDrizzleRepository: FeatureFlagRepository = {
  list() {
    return ResultAsync.fromPromise(db.select().from(featureFlags), wrapDbError("Failed to list feature flags")).map(
      (rows) => rows.map(rowToDomain),
    );
  },

  update(key: FeatureFlagKey, value: boolean) {
    return ResultAsync.fromPromise(
      db
        .update(featureFlags)
        .set({ value: value ? "true" : "false", updatedAt: new Date() })
        .where(eq(featureFlags.key, key)),
      wrapDbError("Failed to update feature flag"),
    ).map(() => undefined);
  },
};
