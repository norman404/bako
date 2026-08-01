import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { shiftDrizzleRepository } from "@/modules/shift-reports/persistence/shift-drizzle.repository";
import { getActiveShift } from "@/modules/shift-reports/use-cases/get-active-shift";
import { openShift } from "@/modules/shift-reports/use-cases/open-shift";
import { closeShift } from "@/modules/shift-reports/use-cases/close-shift";
import { listShiftHistory } from "@/modules/shift-reports/use-cases/list-shift-history";
import { getShiftReport } from "@/modules/shift-reports/use-cases/get-shift-report";
import { addCashMovement } from "@/modules/shift-reports/use-cases/add-cash-movement";
import { updateCashMovement } from "@/modules/shift-reports/use-cases/update-cash-movement";
import { deleteCashMovement } from "@/modules/shift-reports/use-cases/delete-cash-movement";
import { listCashMovements } from "@/modules/shift-reports/use-cases/list-cash-movements";
import type { CashMovementInput, UpdateCashMovementInput } from "@/modules/shift-reports/domain/shift";

export const SHIFT_QUERY_KEYS = {
  active: ["shift", "active"] as const,
  history: ["shift", "history"] as const,
  report: (shiftId: string) => ["shift", "report", shiftId] as const,
  movements: (shiftId: string) => ["shift", "movements", shiftId] as const,
};

export function useActiveShift() {
  return useQuery({
    queryKey: SHIFT_QUERY_KEYS.active,
    queryFn: async () => {
      const result = await getActiveShift(shiftDrizzleRepository);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    staleTime: 30_000,
  });
}

export function useOpenShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (openingCash: number) => {
      const result = await openShift(shiftDrizzleRepository, openingCash);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.active });
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.history });
    },
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, countedCash }: { shiftId: string; countedCash: number }) => {
      const result = await closeShift(shiftDrizzleRepository, shiftId, countedCash);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.active });
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.history });
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.report(variables.shiftId) });
    },
  });
}

export function useShiftHistory() {
  return useQuery({
    queryKey: SHIFT_QUERY_KEYS.history,
    queryFn: async () => {
      const result = await listShiftHistory(shiftDrizzleRepository);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    staleTime: 30_000,
  });
}

export function useShiftReport(shiftId: string | null) {
  return useQuery({
    queryKey: SHIFT_QUERY_KEYS.report(shiftId ?? ""),
    enabled: !!shiftId,
    queryFn: async () => {
      if (!shiftId) throw new Error("Shift ID is required");
      const result = await getShiftReport(shiftDrizzleRepository, shiftId);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    staleTime: 60_000,
  });
}

export function useCashMovements(shiftId: string | null) {
  return useQuery({
    queryKey: SHIFT_QUERY_KEYS.movements(shiftId ?? ""),
    enabled: !!shiftId,
    queryFn: async () => {
      if (!shiftId) throw new Error("Shift ID is required");
      const result = await listCashMovements(shiftDrizzleRepository, shiftId);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    staleTime: 10_000,
  });
}

export function useAddCashMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, input }: { shiftId: string; input: CashMovementInput }) => {
      const result = await addCashMovement(shiftDrizzleRepository, shiftId, input);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.movements(variables.shiftId) });
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.report(variables.shiftId) });
    },
  });
}

export function useUpdateCashMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      shiftId: string;
      input: UpdateCashMovementInput;
    }) => {
      const result = await updateCashMovement(shiftDrizzleRepository, id, input);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.movements(variables.shiftId) });
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.report(variables.shiftId) });
    },
  });
}

export function useDeleteCashMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; shiftId: string }) => {
      const result = await deleteCashMovement(shiftDrizzleRepository, id);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.movements(variables.shiftId) });
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.report(variables.shiftId) });
    },
  });
}
