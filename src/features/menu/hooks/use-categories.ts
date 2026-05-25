import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CategoryCreateInput } from "@/features/menu/domain/ports";
import { categoryDrizzleRepository } from "@/features/menu/persistence/category-drizzle.repository";
import { createCategory } from "@/features/menu/use-cases/create-category";
import { listCategories } from "@/features/menu/use-cases/list-categories";

export const MENU_CATEGORIES_QUERY_KEY = ["menu", "categories"] as const;

export function useCategories() {
  return useQuery({
    queryKey: MENU_CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const result = await listCategories(categoryDrizzleRepository);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CategoryCreateInput) => {
      const result = await createCategory(categoryDrizzleRepository, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY });
    },
  });
}

interface UpdateCategoryMutationInput {
  id: string;
  input: CategoryCreateInput;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateCategoryMutationInput) => {
      const result = await categoryDrizzleRepository.update(id, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY });
    },
  });
}

export function useArchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await categoryDrizzleRepository.archive(id);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY });
    },
  });
}
