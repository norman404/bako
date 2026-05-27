import { describe, expect, it, vi } from "vitest";
import { okAsync } from "neverthrow";

import type { FeatureFlagRepository } from "@/modules/feature-flags/domain/ports";
import { updateFeatureFlag } from "@/modules/feature-flags/use-cases/update-feature-flag";

describe("updateFeatureFlag", () => {
  it("delegates to repository.update() with correct parameters", async () => {
    const mockRepository: FeatureFlagRepository = {
      list: vi.fn(),
      update: vi.fn(() => okAsync(undefined)),
    };

    const result = await updateFeatureFlag(mockRepository, "categories_enabled", true);

    expect(mockRepository.update).toHaveBeenCalledTimes(1);
    expect(mockRepository.update).toHaveBeenCalledWith("categories_enabled", true);
    expect(result.isOk()).toBe(true);
  });
});
