import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { archivePrinter } from "@/modules/printer/use-cases/archive-printer";
import { createPrinter } from "@/modules/printer/use-cases/create-printer";
import { listPrinters } from "@/modules/printer/use-cases/list-printers";
import { updatePrinter } from "@/modules/printer/use-cases/update-printer";
import type { PrinterCreateInput, PrinterUpdateInput } from "@/modules/printer/domain/printer";
import { printerDrizzleRepository } from "@/modules/printer/persistence/printer-drizzle.repository";

export const PRINTERS_QUERY_KEY = ["printers"] as const;

interface UsePrintersOptions {
  enabled?: boolean;
}

export function usePrinters(options: UsePrintersOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: PRINTERS_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const result = await listPrinters(printerDrizzleRepository);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
  });
}

export function useCreatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PrinterCreateInput) => {
      const result = await createPrinter(printerDrizzleRepository, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRINTERS_QUERY_KEY });
    },
  });
}

interface UpdatePrinterMutationInput {
  id: string;
  input: PrinterUpdateInput;
}

export function useUpdatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdatePrinterMutationInput) => {
      const result = await updatePrinter(printerDrizzleRepository, id, input);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRINTERS_QUERY_KEY });
    },
  });
}

export function useArchivePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await archivePrinter(printerDrizzleRepository, id);
      if (result.isErr()) {
        throw result.error;
      }
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRINTERS_QUERY_KEY });
    },
  });
}
