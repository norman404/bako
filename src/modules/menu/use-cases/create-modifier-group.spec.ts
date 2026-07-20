import { describe, expect, it, mock } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import type {
  ModifierGroupRepository,
  ModifierGroupUpsertInput,
} from "@/modules/menu/domain/ports";
import { createModifierGroup } from "@/modules/menu/use-cases/create-modifier-group";

function buildGroup(overrides: Partial<ModifierGroup> = {}): ModifierGroup {
  return {
    id: overrides.id ?? "group-1",
    name: overrides.name ?? "Nivel de hielo",
    type: overrides.type ?? "single",
    required: overrides.required ?? false,
    sortOrder: overrides.sortOrder ?? 0,
    options: overrides.options ?? [],
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

function validInput(): ModifierGroupUpsertInput {
  return {
    name: "Nivel de hielo",
    type: "single",
    required: false,
    sortOrder: 0,
    options: [
      { name: "Sin hielo", priceDelta: 0, isDefault: true, sortOrder: 0 },
      { name: "Normal", priceDelta: 0, isDefault: false, sortOrder: 1 },
    ],
  };
}

describe("createModifierGroup", () => {
  it("delegates to repository.create and returns the created group", async () => {
    const created = buildGroup({ id: "new-id" });
    const createSpy = mock(() => okAsync(created));
    const mockRepository = { create: createSpy } as unknown as ModifierGroupRepository;

    const result = await createModifierGroup(mockRepository, validInput());

    expect(createSpy).toHaveBeenCalledWith(validInput());
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value).toEqual(created);
  });

  it("propagates validation errors from the repository (empty options)", async () => {
    const validationError = new MenuDomainError("Modifier group must have at least one option");
    const createSpy = mock(() => errAsync(validationError));
    const mockRepository = { create: createSpy } as unknown as ModifierGroupRepository;

    const result = await createModifierGroup(mockRepository, { ...validInput(), options: [] });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected createModifierGroup to propagate validation error");
    }
    expect(result.error).toBe(validationError);
  });

  it("propagates validation errors from the repository (multiple defaults on single)", async () => {
    const validationError = new MenuDomainError(
      'Modifier group of type "single" may have at most one default option',
    );
    const createSpy = mock(() => errAsync(validationError));
    const mockRepository = { create: createSpy } as unknown as ModifierGroupRepository;

    const result = await createModifierGroup(mockRepository, {
      ...validInput(),
      options: [
        { name: "A", priceDelta: 0, isDefault: true, sortOrder: 0 },
        { name: "B", priceDelta: 0, isDefault: true, sortOrder: 1 },
      ],
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected createModifierGroup to propagate validation error");
    }
    expect(result.error.message).toContain("default");
  });
});