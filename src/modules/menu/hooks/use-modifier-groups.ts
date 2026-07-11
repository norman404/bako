import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { listCategoryAssignments } from "@/modules/menu/use-cases/list-category-assignments";
import { listModifierGroups } from "@/modules/menu/use-cases/list-modifier-groups";
import { listProductAssignments } from "@/modules/menu/use-cases/list-product-assignments";
import { listProductModifierGroupsBatch } from "@/modules/menu/use-cases/list-product-modifier-groups-batch";
import { listProductModifiers } from "@/modules/menu/use-cases/list-product-modifiers";
import { unassignModifierGroup } from "@/modules/menu/use-cases/unassign-modifier-group";
import { updateModifierGroup } from "@/modules/menu/use-cases/update-modifier-group";

export const MENU_MODIFIER_GROUPS_QUERY_KEY = ["menu", "modifier-groups"] as const;
export const MENU_MODIFIER_ASSIGNMENTS_QUERY_KEY = ["menu", "modifier-assignments"] as const;

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

/**
 * Returns a `productId → ModifierGroup[]` map for the given products.
 *
 * **Performance contract:** at most 2 SQL queries are issued regardless of
 * `products.length` (one batched query for category groups, one for product
 * groups). This replaces the previous N+1 implementation that fired 2N
 * queries when rendering the product grid.
 */
export function useProductModifierGroupsMap(products: Product[]): Record<string, ModifierGroup[]> {
  const queryKey = [
    ...MENU_MODIFIER_GROUPS_QUERY_KEY,
    "batch",
    products.map((p) => p.id).join("|"),
  ];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const inputs = products
        .filter((p): p is Product & { categoryId: string } => Boolean(p.categoryId))
        .map((p) => ({ productId: p.id, categoryId: p.categoryId }));

      const result = await listProductModifierGroupsBatch(
        modifierGroupDrizzleRepository,
        inputs,
      );
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
  });

  // Pre-fill the map with empty arrays for products that have no categoryId,
  // so the consumer can always read `map[product.id]` without a nullish check.
  const map: Record<string, ModifierGroup[]> = {};
  for (const product of products) {
    map[product.id] = (query.data?.[product.id] ?? []);
  }

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
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_ASSIGNMENTS_QUERY_KEY });
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
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_ASSIGNMENTS_QUERY_KEY });
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
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_ASSIGNMENTS_QUERY_KEY });
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
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_ASSIGNMENTS_QUERY_KEY });
    },
  });
}

export function useUnassignModifierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ModifierAssignmentInput) => {
      const result = await unassignModifierGroup(modifierGroupDrizzleRepository, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_GROUPS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: MENU_MODIFIER_ASSIGNMENTS_QUERY_KEY });
    },
  });
}

export function useCategoryAssignments() {
  return useQuery({
    queryKey: [...MENU_MODIFIER_ASSIGNMENTS_QUERY_KEY, "categories"],
    queryFn: async () => {
      const result = await listCategoryAssignments(modifierGroupDrizzleRepository);
      if (result.isErr()) throw result.error;
      return result.value;
    },
  });
}

export function useProductAssignments() {
  return useQuery({
    queryKey: [...MENU_MODIFIER_ASSIGNMENTS_QUERY_KEY, "products"],
    queryFn: async () => {
      const result = await listProductAssignments(modifierGroupDrizzleRepository);
      if (result.isErr()) throw result.error;
      return result.value;
    },
  });
}