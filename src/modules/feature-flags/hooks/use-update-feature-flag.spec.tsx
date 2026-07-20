import * as React from "react";
import { describe, it, expect, mock, beforeEach, type Mock } from "bun:test";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { okAsync, errAsync } from "neverthrow";
import { useUpdateFeatureFlag } from "./use-update-feature-flag";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { FeatureFlagPersistenceError } from "@/modules/feature-flags/domain/errors";

mock.module("@/modules/feature-flags/persistence/feature-flag-drizzle.repository", () => ({
  featureFlagDrizzleRepository: {
    update: mock(),
  },
}));

import { featureFlagDrizzleRepository } from "@/modules/feature-flags/persistence/feature-flag-drizzle.repository";

const updateMock = featureFlagDrizzleRepository.update as Mock<typeof featureFlagDrizzleRepository.update>;

describe("useUpdateFeatureFlag", () => {
  function createWrapper() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    mock.clearAllMocks();
    useFeatureFlagsStore.setState({
      flags: { categories_enabled: false, multiple_menus_enabled: false },
      isLoading: false,
    });
  });

  it("should update feature flag and invalidate query", async () => {
    updateMock.mockReturnValue(okAsync(undefined));

    const { result } = renderHook(() => useUpdateFeatureFlag(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ key: "categories_enabled", value: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(featureFlagDrizzleRepository.update).toHaveBeenCalledWith("categories_enabled", true);
    expect(useFeatureFlagsStore.getState().flags.categories_enabled).toBe(true);
  });

  it("should rollback on error", async () => {
    updateMock.mockReturnValue(
      errAsync(new FeatureFlagPersistenceError("Update failed")),
    );

    const { result } = renderHook(() => useUpdateFeatureFlag(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ key: "categories_enabled", value: true });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Should have rolled back
    expect(useFeatureFlagsStore.getState().flags.categories_enabled).toBe(false);
  });

  it("should perform optimistic update", async () => {
    updateMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(okAsync(undefined) as any), 100);
        }) as any,
    );

    const { result } = renderHook(() => useUpdateFeatureFlag(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ key: "categories_enabled", value: true });
    });

    // Optimistic update should be immediate
    expect(useFeatureFlagsStore.getState().flags.categories_enabled).toBe(true);
  });
});
