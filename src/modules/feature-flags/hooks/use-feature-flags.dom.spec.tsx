import * as React from "react";
import { describe, it, expect, mock, type Mock } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { okAsync, errAsync } from "neverthrow";
import { useFeatureFlags } from "./use-feature-flags";
import type { FeatureFlag } from "@/modules/feature-flags/domain/feature-flag";
import { FeatureFlagPersistenceError } from "@/modules/feature-flags/domain/errors";

mock.module("@/modules/feature-flags/persistence/feature-flag-drizzle.repository", () => ({
  featureFlagDrizzleRepository: {
    list: mock(),
  },
}));

import { featureFlagDrizzleRepository } from "@/modules/feature-flags/persistence/feature-flag-drizzle.repository";

const listMock = featureFlagDrizzleRepository.list as Mock<typeof featureFlagDrizzleRepository.list>;

describe("useFeatureFlags", () => {
  function createWrapper() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it("should fetch feature flags successfully", async () => {
    const mockFlags: FeatureFlag[] = [
      { key: "categories_enabled", value: true, updatedAt: new Date() },
      { key: "multiple_menus_enabled", value: false, updatedAt: new Date() },
    ];

    listMock.mockReturnValue(okAsync(mockFlags));

    const { result } = renderHook(() => useFeatureFlags(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockFlags);
  });

  it("should handle errors", async () => {
    listMock.mockReturnValue(
      errAsync(new FeatureFlagPersistenceError("Failed to load")),
    );

    const { result } = renderHook(() => useFeatureFlags(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
