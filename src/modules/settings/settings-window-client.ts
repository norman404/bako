import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import {
  isSettingsRpcResponse,
  isSettingsWindowChange,
  SETTINGS_MAIN_WINDOW,
  SETTINGS_RPC_ERROR_CODE,
  SETTINGS_RPC_EVENT,
  SETTINGS_RPC_OPERATION,
  SETTINGS_RPC_TIMEOUT_MS,
  type SettingsRpcData,
  type SettingsRpcDataByOperation,
  type SettingsRpcErrorCode,
  type SettingsRpcOperation,
  type SettingsRpcPayloadByOperation,
  type SettingsRpcRequestFor,
  type SettingsRpcResponse,
  type SettingsSnapshot,
} from "./settings-window-protocol";
import { useSettingsWindowStore } from "./settings-window-store";

interface PendingSettingsRequest {
  operation: SettingsRpcOperation;
  resolve: (data: SettingsRpcData) => void;
  reject: (error: SettingsWindowRpcError) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class SettingsWindowRpcError extends Error {
  readonly code: SettingsRpcErrorCode;

  constructor(code: SettingsRpcErrorCode, message: string) {
    super(message);
    this.name = "SettingsWindowRpcError";
    this.code = code;
  }
}

const pendingRequests = new Map<string, PendingSettingsRequest>();
let responseUnlisten: UnlistenFn | null = null;
let changeUnlisten: UnlistenFn | null = null;
let destroyedUnlisten: UnlistenFn | null = null;
let listenerSetup: Promise<void> | null = null;
let bootstrapPromise: Promise<SettingsSnapshot> | null = null;

function rejectPendingRequest(id: string, error: SettingsWindowRpcError): void {
  const pending = pendingRequests.get(id);
  if (!pending) return;

  clearTimeout(pending.timeout);
  pendingRequests.delete(id);
  pending.reject(error);
}

function resolvePendingRequest(id: string, data: SettingsRpcData): void {
  const pending = pendingRequests.get(id);
  if (!pending) return;

  clearTimeout(pending.timeout);
  pendingRequests.delete(id);
  pending.resolve(data);
}

function handleResponse(response: SettingsRpcResponse): void {
  const pending = pendingRequests.get(response.id);
  if (!pending) return;

  if (!response.ok) {
    rejectPendingRequest(response.id, new SettingsWindowRpcError(response.error.code, response.error.message));
    return;
  }

  if (response.operation !== pending.operation) {
    rejectPendingRequest(
      response.id,
      new SettingsWindowRpcError(
        SETTINGS_RPC_ERROR_CODE.INVALID_REQUEST,
        "La respuesta no coincide con la operación solicitada.",
      ),
    );
    return;
  }

  resolvePendingRequest(response.id, response.data);
}

function disposeSettingsWindowClient(): void {
  responseUnlisten?.();
  changeUnlisten?.();
  destroyedUnlisten?.();
  responseUnlisten = null;
  changeUnlisten = null;
  destroyedUnlisten = null;
  listenerSetup = null;

  for (const id of pendingRequests.keys()) {
    rejectPendingRequest(
      id,
      new SettingsWindowRpcError(
        SETTINGS_RPC_ERROR_CODE.MAIN_UNAVAILABLE,
        "La ventana principal ya no está disponible.",
      ),
    );
  }
}

async function ensureSettingsWindowListeners(): Promise<void> {
  if (listenerSetup) return listenerSetup;

  listenerSetup = (async () => {
    responseUnlisten = await listen<unknown>(SETTINGS_RPC_EVENT.RESPONSE, (event) => {
      if (isSettingsRpcResponse(event.payload)) {
        handleResponse(event.payload);
      }
    });

    changeUnlisten = await listen<unknown>(SETTINGS_RPC_EVENT.CHANGE, (event) => {
      if (isSettingsWindowChange(event.payload)) {
        useSettingsWindowStore.getState().applyChange(event.payload);
      }
    });

    destroyedUnlisten = await getCurrentWebviewWindow().once("tauri://destroyed", () => {
      disposeSettingsWindowClient();
    });
  })().catch((error: unknown) => {
    listenerSetup = null;
    throw error;
  });

  return listenerSetup;
}

async function requestSettingsOperation<Operation extends SettingsRpcOperation>(
  operation: Operation,
  payload: SettingsRpcPayloadByOperation[Operation],
): Promise<SettingsRpcDataByOperation[Operation]> {
  await ensureSettingsWindowListeners();

  const id = crypto.randomUUID();
  const request: SettingsRpcRequestFor<Operation> = { id, operation, payload };

  return new Promise<SettingsRpcDataByOperation[Operation]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      rejectPendingRequest(
        id,
        new SettingsWindowRpcError(
          SETTINGS_RPC_ERROR_CODE.TIMEOUT,
          "La ventana principal no respondió a tiempo.",
        ),
      );
    }, SETTINGS_RPC_TIMEOUT_MS);

    pendingRequests.set(id, {
      operation,
      resolve: (data) => resolve(data as SettingsRpcDataByOperation[Operation]),
      reject,
      timeout,
    });

    void getCurrentWebviewWindow()
      .emitTo(SETTINGS_MAIN_WINDOW.LABEL, SETTINGS_RPC_EVENT.REQUEST, request)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "No se pudo contactar a la ventana principal.";
        rejectPendingRequest(
          id,
          new SettingsWindowRpcError(SETTINGS_RPC_ERROR_CODE.MAIN_UNAVAILABLE, message),
        );
      });
  });
}

async function initializeSettingsWindowClient(): Promise<SettingsSnapshot> {
  const existingSnapshot = useSettingsWindowStore.getState().snapshot;
  if (existingSnapshot) return existingSnapshot;
  if (bootstrapPromise) return bootstrapPromise;

  useSettingsWindowStore.getState().setLoading();
  bootstrapPromise = requestSettingsOperation(SETTINGS_RPC_OPERATION.BOOTSTRAP, {})
    .then((snapshot) => {
      useSettingsWindowStore.getState().applySnapshot(snapshot);
      return snapshot;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "No se pudo cargar la configuración.";
      useSettingsWindowStore.getState().setError(message);
      throw error;
    })
    .finally(() => {
      bootstrapPromise = null;
    });

  return bootstrapPromise;
}

export {
  disposeSettingsWindowClient,
  initializeSettingsWindowClient,
  requestSettingsOperation,
};
