import * as React from "react";
import { describe, it, expect, mock, beforeEach, type Mock } from "bun:test";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { okAsync, errAsync, ResultAsync } from "neverthrow";
import { useUpdateFeatureFlag } from "./use-update-feature-flag";
import { useFeatureFlagsStore } from "./feature-flags-store";
import { FeatureFlagPersistenceError } from "./errors";

mock.module("./repository", () => ({
  featureFlagDrizzleRepository: {
    update: mock(),
  },
}));

import { featureFlagDrizzleRepository } from "./repository";

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
    // La persistencia queda en vuelo hasta que el test la resuelve a mano:
    // así se puede observar el estado del store MIENTRAS sigue pendiente.
    let resolvePersistence!: () => void;
    let persistenceSettled = false;
    let flagWhenPersistenceStarted: boolean | undefined;

    const pendingPersistence = new Promise<void>((resolve) => {
      resolvePersistence = resolve;
    }).then(() => {
      persistenceSettled = true;
    });

    updateMock.mockImplementation(() => {
      flagWhenPersistenceStarted = useFeatureFlagsStore.getState().flags.categories_enabled;
      return ResultAsync.fromSafePromise<void, FeatureFlagPersistenceError>(pendingPersistence);
    });

    const { result } = renderHook(() => useUpdateFeatureFlag(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ key: "categories_enabled", value: true });
    });

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));

    // La persistencia arrancó pero NO ha resuelto...
    expect(updateMock).toHaveBeenCalledWith("categories_enabled", true);
    expect(persistenceSettled).toBe(false);

    // ...y aun así el store ya refleja el valor nuevo: eso es el optimismo.
    expect(flagWhenPersistenceStarted).toBe(true);
    expect(useFeatureFlagsStore.getState().flags.categories_enabled).toBe(true);

    // Cerrar la mutación para no dejar trabajo pendiente al terminar el test.
    await act(async () => {
      resolvePersistence();
      await pendingPersistence;
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
