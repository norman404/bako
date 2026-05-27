import { describe, expect, it, vi } from "vitest";
import { okAsync } from "neverthrow";

import type { MenuRepository } from "@/modules/menu/domain/ports";
import type { Menu } from "@/modules/menu/domain/menu";
import { listMenus } from "@/modules/menu/use-cases/list-menus";

describe("listMenus", () => {
  it("delegates to repository.list()", async () => {
    const mockMenus: Menu[] = [
      {
        id: "menu-1",
        name: "Menú Principal",
        isDefault: true,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        updatedAt: new Date("2026-01-01T10:00:00.000Z"),
      },
      {
        id: "menu-2",
        name: "Menú Ejecutivo",
        isDefault: false,
        createdAt: new Date("2026-01-01T11:00:00.000Z"),
        updatedAt: new Date("2026-01-01T11:00:00.000Z"),
      },
    ];

    const mockRepository = {
      list: vi.fn(() => okAsync(mockMenus)),
      create: vi.fn(),
    } as unknown as MenuRepository;

    const result = await listMenus(mockRepository);

    expect(mockRepository.list).toHaveBeenCalledTimes(1);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(mockMenus);
  });
});
