import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  SETTINGS_RPC_OPERATION,
  type SettingsPrinterInput,
  type SettingsPrinterTestInput,
  type SettingsUsbPrinterDto,
} from "./settings-window-protocol";
import { requestSettingsOperation } from "./settings-window-client";
import { useSettingsWindowStore } from "./settings-window-store";

const SETTINGS_WINDOW_PRINTERS_QUERY_KEY = ["settings-window", "printers"] as const;

interface SettingsWindowPrinterUpdateInput {
  id: string;
  input: SettingsPrinterInput;
}

interface SettingsWindowPrinterTestInput {
  input: SettingsPrinterTestInput;
}

export function useSettingsWindowPrinters() {
  const printerRevision = useSettingsWindowStore((state) => state.printerRevision);

  return useQuery({
    queryKey: [...SETTINGS_WINDOW_PRINTERS_QUERY_KEY, printerRevision],
    queryFn: () => requestSettingsOperation(SETTINGS_RPC_OPERATION.LIST_PRINTERS, {}),
  });
}

export function useCreateSettingsWindowPrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SettingsPrinterInput) =>
      requestSettingsOperation(SETTINGS_RPC_OPERATION.CREATE_PRINTER, { input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SETTINGS_WINDOW_PRINTERS_QUERY_KEY });
    },
  });
}

export function useUpdateSettingsWindowPrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: SettingsWindowPrinterUpdateInput) =>
      requestSettingsOperation(SETTINGS_RPC_OPERATION.UPDATE_PRINTER, { id, input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SETTINGS_WINDOW_PRINTERS_QUERY_KEY });
    },
  });
}

export function useArchiveSettingsWindowPrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestSettingsOperation(SETTINGS_RPC_OPERATION.ARCHIVE_PRINTER, { id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SETTINGS_WINDOW_PRINTERS_QUERY_KEY });
    },
  });
}

export function listSettingsWindowUsbPrinters(): Promise<SettingsUsbPrinterDto[]> {
  return requestSettingsOperation(SETTINGS_RPC_OPERATION.LIST_USB_PRINTERS, {});
}

export function testSettingsWindowPrinter(input: SettingsWindowPrinterTestInput): Promise<void> {
  return requestSettingsOperation(SETTINGS_RPC_OPERATION.TEST_PRINTER, input);
}

export { SETTINGS_WINDOW_PRINTERS_QUERY_KEY };
export type { SettingsWindowPrinterTestInput, SettingsWindowPrinterUpdateInput };
