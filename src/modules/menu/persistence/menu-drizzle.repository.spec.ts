import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import type { MenuCreateInput } from "@/modules/menu/domain/ports";
import type { MenuRow } from "@/shared/db/schema";

const dbMocks = (() => {
  const selectFromMock = mock<() => Promise<MenuRow[]>>();
  const selectMock = mock(() => ({ from: selectFromMock }));

  const insertReturningMock = mock<() => Promise<MenuRow[]>>();
  const insertValuesMock = mock<(values: Partial<MenuRow>) => { returning: typeof insertReturningMock }>(
    () => ({ returning: insertReturningMock }),
  );
  const insertMock = mock(() => ({ values: insertValuesMock }));

  return {
    selectFromMock,
    selectMock,
    insertReturningMock,
    insertValuesMock,
    insertMock,
  };
})();

mock.module("@/shared/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
    insert: dbMocks.insertMock,
  },
}));

import { menuDrizzleRepository } from "@/modules/menu/persistence/menu-drizzle.repository";

const validInput: MenuCreateInput = {
  name: "Menú Principal",
  isDefault: false,
};

function buildMenuRow(overrides: Partial<MenuRow> = {}): MenuRow {
  return {
    id: overrides.id ?? "menu-1",
    name: overrides.name ?? "Menú Principal",
    isDefault: overrides.isDefault ?? false,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
  };
}

describe("menuDrizzleRepository", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    dbMocks.insertReturningMock.mockResolvedValue([]);
  });

  describe("list", () => {
    it("fetches all menus and maps to domain type", async () => {
      const rows: MenuRow[] = [
        buildMenuRow({ id: "menu-1", name: "Menú Principal", isDefault: true }),
        buildMenuRow({ id: "menu-2", name: "Menú Ejecutivo", isDefault: false }),
      ];

      dbMocks.selectFromMock.mockResolvedValueOnce(rows);

      const result = await menuDrizzleRepository.list();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;

      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toEqual({
        id: "menu-1",
        name: "Menú Principal",
        isDefault: true,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        updatedAt: new Date("2026-01-01T10:00:00.000Z"),
      });
      expect(result.value[1]).toEqual({
        id: "menu-2",
        name: "Menú Ejecutivo",
        isDefault: false,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        updatedAt: new Date("2026-01-01T10:00:00.000Z"),
      });
    });

    it("returns empty array when no menus exist", async () => {
      dbMocks.selectFromMock.mockResolvedValueOnce([]);

      const result = await menuDrizzleRepository.list();

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;
      expect(result.value).toEqual([]);
    });
  });

  describe("create", () => {
    it("generates a UUID id and persists trimmed values", async () => {
      const generatedId = "a7f5d5d8-9d8b-45ed-8d80-6c0d6a1c6f6a";
      dbMocks.insertReturningMock.mockResolvedValueOnce([buildMenuRow({ id: generatedId })]);
      const randomUuidSpy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

      const result = await menuDrizzleRepository.create({
        name: `  ${validInput.name}  `,
        isDefault: false,
      });

      expect(randomUuidSpy).toHaveBeenCalledTimes(1);
      expect(dbMocks.insertValuesMock).toHaveBeenCalledTimes(1);
      expect(dbMocks.insertReturningMock).toHaveBeenCalledTimes(1);

      const inserted = dbMocks.insertValuesMock.mock.calls[0]![0] as MenuRow;
      expect(inserted.id).toBe(generatedId);
      expect(inserted.name).toBe(validInput.name);
      expect(inserted.isDefault).toBe(false);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      expect(result.value.id).toBe(generatedId);
      expect(result.value.name).toBe(validInput.name);
      expect(result.value.isDefault).toBe(false);
    });

    it("defaults isDefault to false when not provided", async () => {
      const generatedId = "12345678-1234-1234-1234-123456789012";
      dbMocks.insertReturningMock.mockResolvedValueOnce([buildMenuRow({ id: generatedId, isDefault: false })]);
      spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

      const result = await menuDrizzleRepository.create({
        name: validInput.name,
      });

      expect(result.isOk()).toBe(true);
      if (result.isErr()) throw result.error;
      expect(result.value.isDefault).toBe(false);
    });

    it("rejects empty name", async () => {
      const result = await menuDrizzleRepository.create({
        name: "   ",
      });

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        throw new Error("Expected create to fail for empty name");
      }

      expect(result.error.message).toContain("name is required");
      expect(dbMocks.insertValuesMock).not.toHaveBeenCalled();
      expect(dbMocks.selectMock).not.toHaveBeenCalled();
    });
  });
});
