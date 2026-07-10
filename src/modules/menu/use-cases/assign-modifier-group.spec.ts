import { describe, expect, it, vi } from "vitest";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "@/modules/menu/domain/errors";
import type {
  ModifierAssignmentInput,
  ModifierGroupRepository,
} from "@/modules/menu/domain/ports";
import { assignModifierGroup } from "@/modules/menu/use-cases/assign-modifier-group";

describe("assignModifierGroup", () => {
  it("delegates to repository.assign with a category target", async () => {
    const assignSpy = vi.fn(() => okAsync(undefined));
    const mockRepository = { assign: assignSpy } as unknown as ModifierGroupRepository;

    const input: ModifierAssignmentInput = {
      groupId: "g1",
      categoryId: "c1",
      productId: null,
    };

    const result = await assignModifierGroup(mockRepository, input);

    expect(assignSpy).toHaveBeenCalledWith(input);
    expect(result.isOk()).toBe(true);
  });

  it("delegates to repository.assign with a product target", async () => {
    const assignSpy = vi.fn(() => okAsync(undefined));
    const mockRepository = { assign: assignSpy } as unknown as ModifierGroupRepository;

    const input: ModifierAssignmentInput = {
      groupId: "g3",
      categoryId: null,
      productId: "p1",
    };

    const result = await assignModifierGroup(mockRepository, input);

    expect(assignSpy).toHaveBeenCalledWith(input);
    expect(result.isOk()).toBe(true);
  });

  it("propagates validation error when no target provided", async () => {
    const validationError = new MenuDomainError(
      "Modifier assignment requires at least one of categoryId or productId",
    );
    const assignSpy = vi.fn(() => errAsync(validationError));
    const mockRepository = { assign: assignSpy } as unknown as ModifierGroupRepository;

    const result = await assignModifierGroup(mockRepository, {
      groupId: "g1",
      categoryId: null,
      productId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected assignModifierGroup to propagate validation error");
    }
    expect(result.error.message).toContain("at least one");
  });

  it("propagates DB errors (duplicate PK)", async () => {
    const dbError = new MenuDomainError("Failed to assign: UNIQUE constraint failed");
    const assignSpy = vi.fn(() => errAsync(dbError));
    const mockRepository = { assign: assignSpy } as unknown as ModifierGroupRepository;

    const result = await assignModifierGroup(mockRepository, {
      groupId: "g1",
      categoryId: "c1",
      productId: null,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected assignModifierGroup to propagate DB error");
    }
    expect(result.error).toBe(dbError);
  });
});