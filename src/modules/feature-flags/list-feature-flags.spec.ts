import { describe, expect, it, mock } from "bun:test";
import { okAsync } from "neverthrow";

import type { FeatureFlagRepository } from "./ports";
import type { FeatureFlag } from "./feature-flag";
import { listFeatureFlags } from "./list-feature-flags";

describe("listFeatureFlags", () => {
  it("delegates to repository.list()", async () => {
    const mockFlags: FeatureFlag[] = [
      { key: "categories_enabled", value: true, updatedAt: new Date("2026-01-01T10:00:00.000Z") },
      { key: "multiple_menus_enabled", value: false, updatedAt: new Date("2026-01-01T10:00:00.000Z") },
    ];

    const mockRepository: FeatureFlagRepository = {
      list: mock(() => okAsync(mockFlags)),
      update: mock(),
    };

    const result = await listFeatureFlags(mockRepository);

    expect(mockRepository.list).toHaveBeenCalledTimes(1);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(mockFlags);
  });
});
