import { describe, expect, it, vi } from "vitest";
import { okAsync } from "neverthrow";

import type { FeatureFlagRepository } from "@/modules/feature-flags/domain/ports";
import type { FeatureFlag } from "@/modules/feature-flags/domain/feature-flag";
import { listFeatureFlags } from "@/modules/feature-flags/use-cases/list-feature-flags";

describe("listFeatureFlags", () => {
  it("delegates to repository.list()", async () => {
    const mockFlags: FeatureFlag[] = [
      { key: "categories_enabled", value: true, updatedAt: new Date("2026-01-01T10:00:00.000Z") },
      { key: "multiple_menus_enabled", value: false, updatedAt: new Date("2026-01-01T10:00:00.000Z") },
    ];

    const mockRepository: FeatureFlagRepository = {
      list: vi.fn(() => okAsync(mockFlags)),
      update: vi.fn(),
    };

    const result = await listFeatureFlags(mockRepository);

    expect(mockRepository.list).toHaveBeenCalledTimes(1);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(mockFlags);
  });
});
