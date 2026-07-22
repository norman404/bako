import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroupRepository } from "@/modules/menu/domain/ports";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import { listModifierGroups } from "@/modules/menu/use-cases/list-modifier-groups";

function buildGroup(overrides: Partial<ModifierGroup> = {}): ModifierGroup {
  return {
    id: overrides.id ?? "group-1",
    name: overrides.name ?? "Nivel de hielo",
    type: overrides.type ?? "single",
    required: overrides.required ?? false,
    sortOrder: overrides.sortOrder ?? 0,
    firstOptionFree: overrides.firstOptionFree ?? false,
    options: overrides.options ?? [],
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe("listModifierGroups", () => {
  it("delegates to repository.list()", async () => {
    const mockGroups = [buildGroup({ id: "g1" }), buildGroup({ id: "g2" })];
    const mockRepository: ModifierGroupRepository = {
      list: () => okAsync(mockGroups),
    } as ModifierGroupRepository;

    const result = await listModifierGroups(mockRepository);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toEqual(mockGroups);
  });

  it("propagates repository errors", async () => {
    const mockError = new MenuDomainError("Database connection failed");
    const mockRepository: ModifierGroupRepository = {
      list: () => errAsync(mockError),
    } as ModifierGroupRepository;

    const result = await listModifierGroups(mockRepository);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected listModifierGroups to fail");
    }
    expect(result.error).toBe(mockError);
  });
});