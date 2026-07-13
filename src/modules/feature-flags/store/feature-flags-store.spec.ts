import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFeatureFlagsStore } from "./feature-flags-store";

// Mock the repository module
vi.mock("@/modules/feature-flags/persistence/feature-flag-drizzle.repository", () => ({
  featureFlagDrizzleRepository: {
    list: vi.fn(),
    update: vi.fn(),
  },
}));

import { featureFlagDrizzleRepository } from "@/modules/feature-flags/persistence/feature-flag-drizzle.repository";

describe("useFeatureFlagsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
      useFeatureFlagsStore.setState({
        flags: { categories_enabled: false, multiple_menus_enabled: false, delivery_enabled: false, shift_management_enabled: false, auto_update_enabled: true, modifier_groups_enabled: false, comandas_enabled: false, receipt_printing_enabled: true },
        isLoading: true,
      });
  });

  describe("initializeFeatureFlags", () => {
    it("should load default flags in non-Tauri environment (Node/Vitest)", async () => {
      const result = await useFeatureFlagsStore.getState().initializeFeatureFlags();

      expect(result.isOk()).toBe(true);
      expect(useFeatureFlagsStore.getState().flags).toEqual({
        categories_enabled: false,
        multiple_menus_enabled: false,
        delivery_enabled: false,
        shift_management_enabled: false,
        auto_update_enabled: true,
        modifier_groups_enabled: false,
        comandas_enabled: false,
        receipt_printing_enabled: true,
      });
      expect(useFeatureFlagsStore.getState().isLoading).toBe(false);
      // Should NOT call repository in Node environment
      expect(featureFlagDrizzleRepository.list).not.toHaveBeenCalled();
    });
  });

  describe("setFlag", () => {
    it("should update flag value in store synchronously", () => {
      useFeatureFlagsStore.setState({
        flags: { categories_enabled: false, multiple_menus_enabled: false, delivery_enabled: false, shift_management_enabled: false, auto_update_enabled: true, modifier_groups_enabled: false, comandas_enabled: false, receipt_printing_enabled: true },
        isLoading: false,
      });

      useFeatureFlagsStore.getState().setFlag("categories_enabled", true);

      expect(useFeatureFlagsStore.getState().flags.categories_enabled).toBe(true);
    });

    it("should not persist to repository in non-Tauri environment", async () => {
      useFeatureFlagsStore.setState({
        flags: { categories_enabled: false, multiple_menus_enabled: false, delivery_enabled: false, shift_management_enabled: false, auto_update_enabled: true, modifier_groups_enabled: false, comandas_enabled: false, receipt_printing_enabled: true },
        isLoading: false,
      });

      const result = await useFeatureFlagsStore.getState().setFlag("categories_enabled", true);

      expect(result.isOk()).toBe(true);
      expect(featureFlagDrizzleRepository.update).not.toHaveBeenCalled();
    });
  });
});
