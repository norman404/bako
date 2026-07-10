import { create } from "zustand";
import { ResultAsync, okAsync } from "neverthrow";
import type { FeatureFlagKey } from "@/modules/feature-flags/domain/feature-flag";
import type { FeatureFlagPersistenceError } from "@/modules/feature-flags/domain/errors";
import { featureFlagDrizzleRepository } from "@/modules/feature-flags/persistence/feature-flag-drizzle.repository";

const DEFAULT_FLAGS: Record<string, boolean> = {
  categories_enabled: false,
  multiple_menus_enabled: false,
  delivery_enabled: false,
  shift_management_enabled: false,
  auto_update_enabled: true,
  modifier_groups_enabled: false,
};

interface FeatureFlagsState {
  flags: Record<string, boolean>;
  isLoading: boolean;
  initializeFeatureFlags: () => ResultAsync<void, never>;
  setFlag: (key: FeatureFlagKey, value: boolean) => ResultAsync<void, FeatureFlagPersistenceError>;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  flags: DEFAULT_FLAGS,
  isLoading: true,

  initializeFeatureFlags: (): ResultAsync<void, never> => {
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({ flags: DEFAULT_FLAGS, isLoading: false });
      return okAsync(undefined);
    }

    const dbOperation = async () => {
      const result = await featureFlagDrizzleRepository.list();
      if (result.isErr()) {
        // Fallback to defaults on error
        set({ flags: DEFAULT_FLAGS, isLoading: false });
        return;
      }

      const flagsFromDb = result.value;
      if (flagsFromDb.length === 0) {
        // No flags in DB, use defaults
        set({ flags: DEFAULT_FLAGS, isLoading: false });
        return;
      }

      // Build flags map from DB
      const flagsMap = flagsFromDb.reduce(
        (acc, flag) => {
          acc[flag.key] = flag.value;
          return acc;
        },
        {} as Record<string, boolean>,
      );

      set({ flags: flagsMap, isLoading: false });
    };

    return ResultAsync.fromPromise(dbOperation(), () => new Error("Should not happen")).orElse(() => {
      console.warn("Tauri IPC SQLite not available. Activating Vitest/Node fallback.");
      set({ flags: DEFAULT_FLAGS, isLoading: false });
      return okAsync(undefined);
    });
  },

  setFlag: (key: FeatureFlagKey, value: boolean): ResultAsync<void, FeatureFlagPersistenceError> => {
    // Optimistic update
    const currentFlags = get().flags;
    set({ flags: { ...currentFlags, [key]: value } });

    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      return okAsync(undefined);
    }

    return featureFlagDrizzleRepository.update(key, value);
  },
}));
