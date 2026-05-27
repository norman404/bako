import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FeatureFlagRow } from "@/shared/db/schema";

const dbMocks = vi.hoisted(() => {
  const selectFromMock = vi.fn<() => Promise<FeatureFlagRow[]>>();
  const selectMock = vi.fn(() => ({ from: selectFromMock }));

  const updateWhereMock = vi.fn<() => Promise<void>>();
  const updateSetMock = vi.fn<(values: Partial<FeatureFlagRow>) => { where: typeof updateWhereMock }>(
    () => ({ where: updateWhereMock }),
  );
  const updateMock = vi.fn(() => ({ set: updateSetMock }));

  return {
    selectFromMock,
    selectMock,
    updateSetMock,
    updateWhereMock,
    updateMock,
  };
});

vi.mock("@/shared/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
    update: dbMocks.updateMock,
  },
}));

import { featureFlagDrizzleRepository } from "@/modules/feature-flags/persistence/feature-flag-drizzle.repository";

function buildFeatureFlagRow(overrides: Partial<FeatureFlagRow> = {}): FeatureFlagRow {
  return {
    key: overrides.key ?? "categories_enabled",
    value: overrides.value ?? "true",
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
  };
}

describe("featureFlagDrizzleRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.updateWhereMock.mockResolvedValue(undefined);
  });

  describe("list", () => {
    it("fetches all feature flags and maps to domain type with boolean values", async () => {
      const rows: FeatureFlagRow[] = [
        buildFeatureFlagRow({ key: "categories_enabled", value: "true" }),
        buildFeatureFlagRow({ key: "multiple_menus_enabled", value: "false" }),
      ];

      dbMocks.selectFromMock.mockResolvedValueOnce(rows);

      const result = await featureFlagDrizzleRepository.list();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;

      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toEqual({
        key: "categories_enabled",
        value: true,
        updatedAt: new Date("2026-01-01T10:00:00.000Z"),
      });
      expect(result.value[1]).toEqual({
        key: "multiple_menus_enabled",
        value: false,
        updatedAt: new Date("2026-01-01T10:00:00.000Z"),
      });
    });

    it("returns empty array when no flags exist", async () => {
      dbMocks.selectFromMock.mockResolvedValueOnce([]);

      const result = await featureFlagDrizzleRepository.list();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;
      expect(result.value).toEqual([]);
    });
  });

  describe("update", () => {
    it("converts boolean true to 'true' string and updates timestamp", async () => {
      const result = await featureFlagDrizzleRepository.update("categories_enabled", true);

      expect(result.isOk()).toBe(true);
      expect(dbMocks.updateSetMock).toHaveBeenCalledTimes(1);
      expect(dbMocks.updateWhereMock).toHaveBeenCalledTimes(1);

      const updatePayload = dbMocks.updateSetMock.mock.calls[0]![0] as {
        value?: string;
        updatedAt?: Date;
      };

      expect(updatePayload.value).toBe("true");
      expect(updatePayload.updatedAt).toBeInstanceOf(Date);
    });

    it("converts boolean false to 'false' string", async () => {
      const result = await featureFlagDrizzleRepository.update("multiple_menus_enabled", false);

      expect(result.isOk()).toBe(true);
      expect(dbMocks.updateSetMock).toHaveBeenCalledTimes(1);

      const updatePayload = dbMocks.updateSetMock.mock.calls[0]![0] as {
        value?: string;
        updatedAt?: Date;
      };

      expect(updatePayload.value).toBe("false");
      expect(updatePayload.updatedAt).toBeInstanceOf(Date);
    });
  });
});
