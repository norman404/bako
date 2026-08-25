import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { emitTo, listen, type UnlistenFn } from "@tauri-apps/api/event";

import { useMountEffect } from "@/lib/use-mount-effect";
import { useFeatureFlagsStore } from "@/modules/feature-flags";
import {
  PRINTERS_QUERY_KEY,
  printerSettingsService,
  type Printer,
  type PrinterCreateInput,
  type PrinterTestInput,
} from "@/modules/printer";
import {
  exportDatabase,
  getDatabaseInfo,
  getSettingsRpcRequestReference,
  isSettingsRpcOperation,
  isSettingsRpcRequest,
  restoreDatabase,
  SETTINGS_CHANGE_KIND,
  SETTINGS_RPC_ERROR_CODE,
  SETTINGS_RPC_EVENT,
  SETTINGS_RPC_OPERATION,
  SETTINGS_UPDATE_STATUS,
  SETTINGS_WINDOW,
  useSettingsStore,
  type SettingsPrinterDto,
  type SettingsPrinterInput,
  type SettingsPrinterTestInput,
  type SettingsRpcData,
  type SettingsRpcFailure,
  type SettingsRpcRequest,
  type SettingsRpcResponse,
  type SettingsSnapshot,
  type SettingsUpdateInfoDto,
  type SettingsWindowChange,
} from "@/modules/settings";
import {
  UpdateStatus,
  useUpdaterStore,
  type UpdateInfo,
} from "@/modules/updater";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toUpdaterDto(status: UpdateInfo): SettingsUpdateInfoDto {
  switch (status.kind) {
    case UpdateStatus.Idle:
      return { kind: SETTINGS_UPDATE_STATUS.IDLE };
    case UpdateStatus.Checking:
      return { kind: SETTINGS_UPDATE_STATUS.CHECKING };
    case UpdateStatus.Available:
      return { kind: SETTINGS_UPDATE_STATUS.AVAILABLE, version: status.version, notes: status.notes };
    case UpdateStatus.Downloading:
      return {
        kind: SETTINGS_UPDATE_STATUS.DOWNLOADING,
        progress: {
          downloaded: status.progress.downloaded,
          contentLength: status.progress.contentLength,
          percentage: status.progress.percentage,
        },
      };
    case UpdateStatus.ReadyToInstall:
      return { kind: SETTINGS_UPDATE_STATUS.READY_TO_INSTALL, version: status.version };
    case UpdateStatus.Error:
      return { kind: SETTINGS_UPDATE_STATUS.ERROR, message: status.message };
  }
}

function createSnapshot(): SettingsSnapshot {
  const settings = useSettingsStore.getState();
  const flags = useFeatureFlagsStore.getState().flags;
  const updater = useUpdaterStore.getState().status;

  return {
    locale: settings.locale,
    currency: settings.currency,
    shiftListOrder: settings.shiftListOrder,
    comandaHeaderText: settings.comandaHeaderText,
    flags: { ...flags },
    updater: toUpdaterDto(updater),
  };
}

function toPrinterDto(printer: Printer): SettingsPrinterDto {
  return {
    id: printer.id,
    name: printer.name,
    type: printer.type,
    address: printer.address,
    role: printer.role,
    isDefault: printer.isDefault,
    labelWidthMm: printer.labelWidthMm,
    labelHeightMm: printer.labelHeightMm,
    labelGapMm: printer.labelGapMm,
    labelLanguage: printer.labelLanguage,
    labelOrientation: printer.labelOrientation,
    createdAt: printer.createdAt.toISOString(),
    updatedAt: printer.updatedAt.toISOString(),
    deletedAt: printer.deletedAt?.toISOString() ?? null,
  };
}

function toPrinterInput(input: SettingsPrinterInput): PrinterCreateInput {
  return {
    name: input.name,
    type: input.type,
    address: input.address,
    role: input.role,
    isDefault: input.isDefault,
    labelWidthMm: input.labelWidthMm,
    labelHeightMm: input.labelHeightMm,
    labelGapMm: input.labelGapMm,
    labelLanguage: input.labelLanguage,
    labelOrientation: input.labelOrientation,
  };
}

function toPrinterTestInput(input: SettingsPrinterTestInput): PrinterTestInput {
  return {
    printerType: input.printerType,
    printerAddress: input.printerAddress,
    labelWidthMm: input.labelWidthMm,
    labelHeightMm: input.labelHeightMm,
    labelGapMm: input.labelGapMm,
    labelLanguage: input.labelLanguage,
  };
}

async function emitToSettings(
  event: string,
  payload: SettingsRpcResponse | SettingsWindowChange,
): Promise<void> {
  await emitTo(SETTINGS_WINDOW.LABEL, event, payload);
}

async function emitChange(change: SettingsWindowChange): Promise<void> {
  try {
    await emitToSettings(SETTINGS_RPC_EVENT.CHANGE, change);
  } catch {
    // The child can close while Main is handling a request.
  }
}

async function invalidatePrinters(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: PRINTERS_QUERY_KEY });
  await emitChange({ kind: SETTINGS_CHANGE_KIND.PRINTERS_INVALIDATED });
}

async function executeRequest(
  request: SettingsRpcRequest,
  queryClient: QueryClient,
): Promise<SettingsRpcData> {
  switch (request.operation) {
    case SETTINGS_RPC_OPERATION.BOOTSTRAP:
      return createSnapshot();
    case SETTINGS_RPC_OPERATION.UPDATE_REGIONAL: {
      const result = await useSettingsStore
        .getState()
        .updateSettings(request.payload.locale, request.payload.currency);
      if (result.isErr()) throw result.error;
      return createSnapshot();
    }
    case SETTINGS_RPC_OPERATION.UPDATE_SHIFT_LIST_ORDER: {
      const result = await useSettingsStore
        .getState()
        .updateShiftListOrder(request.payload.shiftListOrder);
      if (result.isErr()) throw result.error;
      return createSnapshot();
    }
    case SETTINGS_RPC_OPERATION.UPDATE_COMANDA_HEADER: {
      const result = await useSettingsStore
        .getState()
        .updateComandaHeaderText(request.payload.text);
      if (result.isErr()) throw result.error;
      return createSnapshot();
    }
    case SETTINGS_RPC_OPERATION.UPDATE_FEATURE_FLAG: {
      const result = await useFeatureFlagsStore
        .getState()
        .setFlag(request.payload.key, request.payload.value);
      if (result.isErr()) throw result.error;
      return createSnapshot();
    }
    case SETTINGS_RPC_OPERATION.LIST_PRINTERS:
      return (await printerSettingsService.list()).map(toPrinterDto);
    case SETTINGS_RPC_OPERATION.CREATE_PRINTER: {
      const printer = await printerSettingsService.create(toPrinterInput(request.payload.input));
      await invalidatePrinters(queryClient);
      return toPrinterDto(printer);
    }
    case SETTINGS_RPC_OPERATION.UPDATE_PRINTER: {
      const printer = await printerSettingsService.update(
        request.payload.id,
        toPrinterInput(request.payload.input),
      );
      await invalidatePrinters(queryClient);
      return toPrinterDto(printer);
    }
    case SETTINGS_RPC_OPERATION.ARCHIVE_PRINTER:
      await printerSettingsService.archive(request.payload.id);
      await invalidatePrinters(queryClient);
      return null;
    case SETTINGS_RPC_OPERATION.TEST_PRINTER:
      await printerSettingsService.test(toPrinterTestInput(request.payload.input));
      return null;
    case SETTINGS_RPC_OPERATION.LIST_USB_PRINTERS:
      return printerSettingsService.listUsb();
    case SETTINGS_RPC_OPERATION.GET_DATABASE_INFO:
      return getDatabaseInfo();
    case SETTINGS_RPC_OPERATION.EXPORT_DATABASE:
      await exportDatabase(request.payload.destination);
      return null;
    case SETTINGS_RPC_OPERATION.RESTORE_DATABASE:
      await restoreDatabase(request.payload.source);
      return null;
    case SETTINGS_RPC_OPERATION.CHECK_FOR_UPDATES:
      await useUpdaterStore.getState().checkForUpdates();
      return toUpdaterDto(useUpdaterStore.getState().status);
    case SETTINGS_RPC_OPERATION.DOWNLOAD_UPDATE:
      await useUpdaterStore.getState().downloadAndInstall();
      return toUpdaterDto(useUpdaterStore.getState().status);
    case SETTINGS_RPC_OPERATION.RELAUNCH:
      await useUpdaterStore.getState().relaunch();
      return null;
  }
}

async function emitFailure(
  id: string,
  operation: string,
  failure: SettingsRpcFailure,
): Promise<void> {
  const response: SettingsRpcResponse = { id, operation, ok: false, error: failure };
  try {
    await emitToSettings(SETTINGS_RPC_EVENT.RESPONSE, response);
  } catch {
    // The child can close while Main is handling a request.
  }
}

async function handleSettingsRequest(
  payload: unknown,
  queryClient: QueryClient,
): Promise<void> {
  const reference = getSettingsRpcRequestReference(payload);

  if (!isSettingsRpcRequest(payload)) {
    if (!reference) return;

    await emitFailure(reference.id, reference.operation, {
      code: isSettingsRpcOperation(reference.operation)
        ? SETTINGS_RPC_ERROR_CODE.INVALID_REQUEST
        : SETTINGS_RPC_ERROR_CODE.UNSUPPORTED_OPERATION,
      message: "La solicitud de configuración no es válida.",
    });
    return;
  }

  try {
    const data = await executeRequest(payload, queryClient);
    const response: SettingsRpcResponse = {
      id: payload.id,
      operation: payload.operation,
      ok: true,
      data,
    };
    await emitToSettings(SETTINGS_RPC_EVENT.RESPONSE, response);
  } catch (error) {
    await emitFailure(payload.id, payload.operation, {
      code: SETTINGS_RPC_ERROR_CODE.OPERATION_FAILED,
      message: errorMessage(error),
    });
  }
}

export function useSettingsWindowBridge(): () => Promise<void> {
  const queryClient = useQueryClient();
  const readyRef = useRef<Promise<void> | null>(null);

  useMountEffect(() => {
    const unsubscribeSettings = useSettingsStore.subscribe((state, previousState) => {
      if (
        state.locale !== previousState.locale ||
        state.currency !== previousState.currency ||
        state.shiftListOrder !== previousState.shiftListOrder ||
        state.comandaHeaderText !== previousState.comandaHeaderText
      ) {
        void emitChange({ kind: SETTINGS_CHANGE_KIND.SETTINGS, value: createSnapshot() });
      }
    });
    const unsubscribeFlags = useFeatureFlagsStore.subscribe((state, previousState) => {
      if (state.flags !== previousState.flags) {
        void emitChange({ kind: SETTINGS_CHANGE_KIND.FLAGS, value: { ...state.flags } });
      }
    });
    const unsubscribeUpdater = useUpdaterStore.subscribe((state, previousState) => {
      if (state.status !== previousState.status) {
        void emitChange({ kind: SETTINGS_CHANGE_KIND.UPDATER, value: toUpdaterDto(state.status) });
      }
    });
    const unlistenPromise = listen<unknown>(SETTINGS_RPC_EVENT.REQUEST, (event) => {
      void handleSettingsRequest(event.payload, queryClient);
    });
    readyRef.current = unlistenPromise.then(() => undefined);

    return () => {
      readyRef.current = null;
      unsubscribeSettings();
      unsubscribeFlags();
      unsubscribeUpdater();
      void unlistenPromise.then((unlisten: UnlistenFn) => unlisten());
    };
  });

  return async () => {
    const ready = readyRef.current;
    if (!ready) {
      throw new Error("El bridge de configuración todavía no está listo.");
    }
    await ready;
  };
}
