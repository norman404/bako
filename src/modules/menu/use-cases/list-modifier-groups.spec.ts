import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroupRepository } from "@/modules/menu/domain/ports";
import { listModifierGroups } from "@/modules/menu/use-cases/list-modifier-groups";
import { buildModifierGroup } from "@/modules/menu/test/factories";

describe("listModifierGroups", () => {
  it("delegates to repository.list()", async () => {
    const mockGroups = [buildModifierGroup({ id: "g1" }), buildModifierGroup({ id: "g2" })];
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
