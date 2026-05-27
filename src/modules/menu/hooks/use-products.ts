import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ProductUpsertInput } from "@/modules/menu/domain/ports";
import { productDrizzleRepository } from "@/modules/menu/persistence/product-drizzle.repository";
import { listProducts } from "@/modules/menu/use-cases/list-products";

export const MENU_PRODUCTS_QUERY_KEY = ["menu", "products"] as const;

export function useProducts(menuIds?: string[]) {
  return useQuery({
    queryKey: menuIds ? [...MENU_PRODUCTS_QUERY_KEY, "menuIds", menuIds] : MENU_PRODUCTS_QUERY_KEY,
    queryFn: async () => {
      const result = await listProducts(productDrizzleRepository, menuIds);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProductUpsertInput) => {
      const result = await productDrizzleRepository.create(input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_PRODUCTS_QUERY_KEY });
    },
  });
}

interface UpdateProductMutationInput {
  id: string;
  input: ProductUpsertInput;
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateProductMutationInput) => {
      const result = await productDrizzleRepository.update(id, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_PRODUCTS_QUERY_KEY });
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await productDrizzleRepository.archive(id);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_PRODUCTS_QUERY_KEY });
    },
  });
}
