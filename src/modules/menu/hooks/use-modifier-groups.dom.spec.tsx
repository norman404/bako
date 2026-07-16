import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import type { ModifierGroupUpsertInput } from "@/modules/menu/domain/ports";

vi.mock("@/modules/menu/persistence/modifier-group-drizzle.repository", () => ({
  modifierGroupDrizzleRepository: {
    update: vi.fn(),
  },
}));

import { modifierGroupDrizzleRepository } from "@/modules/menu/persistence/modifier-group-drizzle.repository";
import {
  MENU_MODIFIER_GROUPS_QUERY_KEY,
  useReorderModifierGroups,
  useUpdateModifierGroup,
} from "./use-modifier-groups";

function buildGroup(id: string, name: string, sortOrder: number): ModifierGroup {
  return {
    id,
    name,
    type: "single",
    required: false,
    sortOrder,
    options: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

function buildUpsertInput(group: ModifierGroup, sortOrder: number): ModifierGroupUpsertInput {
  return {
    name: group.name,
    type: group.type,
    required: group.required,
    sortOrder,
    options: group.options.map((option) => ({
      name: option.name,
      priceDelta: option.priceDelta,
      isDefault: option.isDefault,
      sortOrder: option.sortOrder,
    })),
  };
}

describe("useReorderModifierGroups", () => {
  function createWrapper(queryClient: QueryClient) {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  function createQueryClient(): QueryClient {
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
  }

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reassigns sortOrder to all groups and reorders optimistically", async () => {
    const hielo = buildGroup("g-hielo", "Hielo", 0);
    const azucar = buildGroup("g-azucar", "Azucar", 0);
    const demo = buildGroup("g-demo", "Demo", 0);
    const groupsById: Record<string, ModifierGroup> = {
      "g-hielo": hielo,
      "g-azucar": azucar,
      "g-demo": demo,
    };

    const queryClient = createQueryClient();
    queryClient.setQueryData(MENU_MODIFIER_GROUPS_QUERY_KEY, [hielo, azucar, demo]);

    vi.mocked(modifierGroupDrizzleRepository.update).mockImplementation(
      (id: string, input: ModifierGroupUpsertInput) =>
        okAsync({ ...groupsById[id], sortOrder: input.sortOrder }),
    );

    const { result } = renderHook(() => useReorderModifierGroups(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        groups: [
          { id: "g-hielo", input: buildUpsertInput(hielo, 1) },
          { id: "g-azucar", input: buildUpsertInput(azucar, 0) },
          { id: "g-demo", input: buildUpsertInput(demo, 2) },
        ],
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    const cached = queryClient.getQueryData<ModifierGroup[]>(MENU_MODIFIER_GROUPS_QUERY_KEY);
    expect(cached?.map((g) => ({ id: g.id, sortOrder: g.sortOrder }))).toEqual([
      { id: "g-azucar", sortOrder: 0 },
      { id: "g-hielo", sortOrder: 1 },
      { id: "g-demo", sortOrder: 2 },
    ]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(modifierGroupDrizzleRepository.update).toHaveBeenCalledTimes(3);
  });

  it("rolls back when one of the parallel updates fails", async () => {
    const hielo = buildGroup("g-hielo", "Hielo", 0);
    const azucar = buildGroup("g-azucar", "Azucar", 0);

    const queryClient = createQueryClient();
    queryClient.setQueryData(MENU_MODIFIER_GROUPS_QUERY_KEY, [hielo, azucar]);

    vi.mocked(modifierGroupDrizzleRepository.update).mockImplementation(
      (id: string, _input: ModifierGroupUpsertInput) =>
        id === "g-azucar"
          ? okAsync({ ...azucar, sortOrder: 0 })
          : errAsync(new MenuDomainError("Update failed")),
    );

    const { result } = renderHook(() => useReorderModifierGroups(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        groups: [
          { id: "g-azucar", input: buildUpsertInput(azucar, 0) },
          { id: "g-hielo", input: buildUpsertInput(hielo, 1) },
        ],
      }),
    ).rejects.toThrow();

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<ModifierGroup[]>(MENU_MODIFIER_GROUPS_QUERY_KEY);
    expect(cached?.map((g) => ({ id: g.id, sortOrder: g.sortOrder }))).toEqual([
      { id: "g-hielo", sortOrder: 0 },
      { id: "g-azucar", sortOrder: 0 },
    ]);
  });
});

describe("useUpdateModifierGroup", () => {
  function createWrapper(queryClient: QueryClient) {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  function createQueryClient(): QueryClient {
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
  }

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("optimistically reassigns sortOrder for the updated group and reorders", async () => {
    const hielo = buildGroup("g-hielo", "Hielo", 0);
    const tamano = buildGroup("g-tamano", "Tamaño", 1);

    const queryClient = createQueryClient();
    queryClient.setQueryData(MENU_MODIFIER_GROUPS_QUERY_KEY, [hielo, tamano]);

    vi.mocked(modifierGroupDrizzleRepository.update).mockReturnValue(
      okAsync({ ...tamano, sortOrder: 0 }),
    );

    const { result } = renderHook(() => useUpdateModifierGroup(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        id: "g-tamano",
        input: buildUpsertInput(tamano, 0),
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    const cached = queryClient.getQueryData<ModifierGroup[]>(MENU_MODIFIER_GROUPS_QUERY_KEY);
    expect(cached?.map((g) => ({ id: g.id, sortOrder: g.sortOrder }))).toEqual([
      { id: "g-tamano", sortOrder: 0 },
      { id: "g-hielo", sortOrder: 1 },
    ]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back the optimistic sortOrder swap when the mutation fails", async () => {
    const hielo = buildGroup("g-hielo", "Hielo", 0);
    const tamano = buildGroup("g-tamano", "Tamaño", 1);

    const queryClient = createQueryClient();
    queryClient.setQueryData(MENU_MODIFIER_GROUPS_QUERY_KEY, [hielo, tamano]);

    vi.mocked(modifierGroupDrizzleRepository.update).mockReturnValue(
      errAsync(new MenuDomainError("Update failed")),
    );

    const { result } = renderHook(() => useUpdateModifierGroup(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        id: "g-tamano",
        input: buildUpsertInput(tamano, 0),
      }),
    ).rejects.toThrow();

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<ModifierGroup[]>(MENU_MODIFIER_GROUPS_QUERY_KEY);
    expect(cached?.map((g) => ({ id: g.id, sortOrder: g.sortOrder }))).toEqual([
      { id: "g-hielo", sortOrder: 0 },
      { id: "g-tamano", sortOrder: 1 },
    ]);

    expect(modifierGroupDrizzleRepository.update).toHaveBeenCalledWith("g-tamano", buildUpsertInput(tamano, 0));
  });
});
