import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MenuCreateInput } from "@/modules/menu/domain/ports";
import { menuDrizzleRepository } from "@/modules/menu/persistence/menu-drizzle.repository";
import { listMenus } from "@/modules/menu/use-cases/list-menus";

export const MENU_MENUS_QUERY_KEY = ["menu", "menus"] as const;

export function useMenus() {
  return useQuery({
    queryKey: MENU_MENUS_QUERY_KEY,
    queryFn: async () => {
      const result = await listMenus(menuDrizzleRepository);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
  });
}

export function useCreateMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MenuCreateInput) => {
      const result = await menuDrizzleRepository.create(input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_MENUS_QUERY_KEY });
    },
  });
}

interface UpdateMenuMutationInput {
  id: string;
  input: MenuCreateInput;
}

export function useUpdateMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateMenuMutationInput) => {
      const result = await menuDrizzleRepository.update(id, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_MENUS_QUERY_KEY });
    },
  });
}

export function useDeleteMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await menuDrizzleRepository.delete(id);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MENU_MENUS_QUERY_KEY });
    },
  });
}
