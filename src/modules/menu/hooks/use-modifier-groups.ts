import { useMutation, useQuery, useQueryClient, useQueries } from "@tanstack/react-query";

import type { Product } from "@/modules/menu/domain/product";
import type {
  ModifierAssignmentInput,
  ModifierGroupUpsertInput,
} from "@/modules/menu/domain/ports";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import { modifierGroupDrizzleRepository } from "@/modules/menu/persistence/modifier-group-drizzle.repository";
import { assignModifierGroup } from "@/modules/menu/use-cases/assign-modifier-group";
import { archiveModifierGroup } from "@/modules/menu/use-cases/archive-modifier-group";
import { createModifierGroup } from "@/modules/menu/use-cases/create-modifier-group";
import { listModifierGroups } from "@/modules/menu/use-cases/list-modifier-groups";
import { listProductModifiers } from "@/modules/menu/use-cases/list-product-modifiers";
import { updateModifierGroup } from "@/modules/menu/use-cases/update-modifier-group";

export const MENU_MODIFIER_GROUPS_QUERY_KEY = ["menu", "modifier-groups"] as const;

export function useModifierGroups() {
  return useQuery({
    queryKey: MENU_MODIFIER_GROUPS_QUERY_KEY,
    queryFn: async () => {
      const result = await listModifierGroups(modifierGroupDrizzleRepository);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
  });
}

export function useProductModifierGroups(productId: string | undefined, categoryId: string | undefined) {
  return useQuery({
    queryKey: [...MENU_MODIFIER_GROUPS_QUERY_KEY, "product", productId ?? "unknown"],
    queryFn: async () => {
      if (!productId || !categoryId) {
        return [];
      }
      const result = await listProductModifiers(
        modifierGroupDrizzleRepository,
        categoryId,
        productId,
      );
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    enabled: Boolean(productId && categoryId),
  });
}

export interface ProductModifierGroupsMapResult {
  map: Record<string, ModifierGroup[]>;
  isLoading: boolean;
}

export function useProductModifierGroupsMap(products: Product[]): Record<string, ModifierGroup[]> {
  const queries = useQueries({
    queries: products.map((product) => ({
      queryKey: [...MENU_MODIFIER_GROUPS_QUERY_KEY, "product", product.id],
      queryFn: async () => {
        if (!product.categoryId) {
          return [] as ModifierGroup[];
        }
        const result = await listProductModifiers(
          modifierGroupDrizzleRepository,
          product.categoryId,
          product.id,
        );
        if (result.isErr()) {
          throw result.error;
        }
        return result.value;
      },
      enabled: Boolean(product.categoryId),
    })),
  });

  const map: Record<string, ModifierGroup[]> = {};
  products.forEach((product, index) => {
    const query = queries[index];
    map[product.id] = (query?.data as ModifierGroup[] | undefined) ?? [];
  });

  return map;
}

export function useCreateModifierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ModifierGroupUpsertInput) => {
      const result = await createModifierGroup(modifierGroupDrizzleRepository, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_GROUPS_QUERY_KEY });
    },
  });
}

interface UpdateModifierGroupMutationInput {
  id: string;
  input: ModifierGroupUpsertInput;
}

export function useUpdateModifierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateModifierGroupMutationInput) => {
      const result = await updateModifierGroup(modifierGroupDrizzleRepository, id, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_GROUPS_QUERY_KEY });
    },
  });
}

export function useArchiveModifierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await archiveModifierGroup(modifierGroupDrizzleRepository, id);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_GROUPS_QUERY_KEY });
    },
  });
}

export function useAssignModifierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ModifierAssignmentInput) => {
      const result = await assignModifierGroup(modifierGroupDrizzleRepository, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_GROUPS_QUERY_KEY });
    },
  });
}