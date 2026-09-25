import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { METRICS_QUERY_KEYS } from "@/modules/metrics";

import { shiftDrizzleRepository } from "./repository";
import { getActiveShift } from "./get-active-shift";
import { openShift } from "./open-shift";
import { closeShift } from "./close-shift";
import { listShiftHistory } from "./list-shift-history";
import { getShiftReport } from "./get-shift-report";
import { addCashMovement } from "./add-cash-movement";
import { updateCashMovement } from "./update-cash-movement";
import { deleteCashMovement } from "./delete-cash-movement";
import { listCashMovements } from "./list-cash-movements";
import type { CashMovementInput, UpdateCashMovementInput } from "./shift";

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
      await queryClient.invalidateQueries({ queryKey: METRICS_QUERY_KEYS.SALES });
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
      await queryClient.invalidateQueries({ queryKey: METRICS_QUERY_KEYS.SALES });
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
