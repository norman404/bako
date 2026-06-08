import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { shiftDrizzleRepository } from "@/modules/shift-reports/persistence/shift-drizzle.repository";
import { getActiveShift } from "@/modules/shift-reports/use-cases/get-active-shift";
import { openShift } from "@/modules/shift-reports/use-cases/open-shift";
import { closeShift } from "@/modules/shift-reports/use-cases/close-shift";
import { listShiftHistory } from "@/modules/shift-reports/use-cases/list-shift-history";
import { getShiftReport } from "@/modules/shift-reports/use-cases/get-shift-report";

export const SHIFT_QUERY_KEYS = {
  active: ["shift", "active"] as const,
  history: ["shift", "history"] as const,
  report: (shiftId: string) => ["shift", "report", shiftId] as const,
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
    mutationFn: async () => {
      const result = await openShift(shiftDrizzleRepository);
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
    mutationFn: async (shiftId: string) => {
      const result = await closeShift(shiftDrizzleRepository, shiftId);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.active });
      await queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEYS.history });
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
