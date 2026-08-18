const SETTINGS_MAIN_WINDOW = {
  LABEL: "main",
} as const;

const SETTINGS_WINDOW = {
  LABEL: "settings",
} as const;

const SETTINGS_RPC_EVENT = {
  REQUEST: "bako:settings-rpc-request",
  RESPONSE: "bako:settings-rpc-response",
  CHANGE: "bako:settings-rpc-change",
} as const;

const SETTINGS_RPC_OPERATION = {
  BOOTSTRAP: "bootstrap",
  UPDATE_REGIONAL: "update-regional",
  UPDATE_COMANDA_HEADER: "update-comanda-header",
  UPDATE_FEATURE_FLAG: "update-feature-flag",
  LIST_PRINTERS: "list-printers",
  CREATE_PRINTER: "create-printer",
  UPDATE_PRINTER: "update-printer",
  ARCHIVE_PRINTER: "archive-printer",
  TEST_PRINTER: "test-printer",
  LIST_USB_PRINTERS: "list-usb-printers",
  GET_DATABASE_INFO: "get-database-info",
  EXPORT_DATABASE: "export-database",
  RESTORE_DATABASE: "restore-database",
  CHECK_FOR_UPDATES: "check-for-updates",
  DOWNLOAD_UPDATE: "download-update",
  RELAUNCH: "relaunch",
} as const;

type SettingsRpcOperation =
  (typeof SETTINGS_RPC_OPERATION)[keyof typeof SETTINGS_RPC_OPERATION];

const SETTINGS_RPC_ERROR_CODE = {
  INVALID_REQUEST: "invalid-request",
  UNSUPPORTED_OPERATION: "unsupported-operation",
  OPERATION_FAILED: "operation-failed",
  MAIN_UNAVAILABLE: "main-unavailable",
  TIMEOUT: "timeout",
} as const;

type SettingsRpcErrorCode =
  (typeof SETTINGS_RPC_ERROR_CODE)[keyof typeof SETTINGS_RPC_ERROR_CODE];

const SETTINGS_PRINTER_TYPE = {
  USB: "usb",
  NETWORK: "network",
  LABEL: "label",
} as const;

type SettingsPrinterType =
  (typeof SETTINGS_PRINTER_TYPE)[keyof typeof SETTINGS_PRINTER_TYPE];

const SETTINGS_PRINTER_ROLE = {
  RECEIPT: "receipt",
  COMANDA: "comanda",
} as const;

type SettingsPrinterRole =
  (typeof SETTINGS_PRINTER_ROLE)[keyof typeof SETTINGS_PRINTER_ROLE];

const SETTINGS_LABEL_LANGUAGE = {
  TSPL: "tspl",
  ZPL: "zpl",
  EPL: "epl",
  CPCL: "cpcl",
} as const;

type SettingsLabelLanguage =
  (typeof SETTINGS_LABEL_LANGUAGE)[keyof typeof SETTINGS_LABEL_LANGUAGE];

const SETTINGS_PRINTER_ORIENTATION = {
  LANDSCAPE: "landscape",
  PORTRAIT: "portrait",
} as const;

type SettingsPrinterOrientation =
  (typeof SETTINGS_PRINTER_ORIENTATION)[keyof typeof SETTINGS_PRINTER_ORIENTATION];

const SETTINGS_UPDATE_STATUS = {
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  DOWNLOADING: "downloading",
  READY_TO_INSTALL: "ready-to-install",
  ERROR: "error",
} as const;

type SettingsUpdateStatus =
  (typeof SETTINGS_UPDATE_STATUS)[keyof typeof SETTINGS_UPDATE_STATUS];

const SETTINGS_CHANGE_KIND = {
  SETTINGS: "settings",
  FLAGS: "flags",
  UPDATER: "updater",
  PRINTERS_INVALIDATED: "printers-invalidated",
} as const;

type SettingsChangeKind =
  (typeof SETTINGS_CHANGE_KIND)[keyof typeof SETTINGS_CHANGE_KIND];

const SETTINGS_RPC_TIMEOUT_MS = 15_000;

interface SettingsEmptyPayload {}

interface SettingsUpdateRegionalPayload {
  locale: string;
  currency: string;
}

interface SettingsUpdateComandaHeaderPayload {
  text: string | null;
}

interface SettingsUpdateFeatureFlagPayload {
  key: string;
  value: boolean;
}

interface SettingsPrinterInput {
  name: string;
  type: SettingsPrinterType;
  address: string;
  role: SettingsPrinterRole;
  isDefault?: boolean;
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelLanguage?: SettingsLabelLanguage;
  labelOrientation?: SettingsPrinterOrientation;
}

interface SettingsCreatePrinterPayload {
  input: SettingsPrinterInput;
}

interface SettingsUpdatePrinterPayload {
  id: string;
  input: SettingsPrinterInput;
}

interface SettingsArchivePrinterPayload {
  id: string;
}

interface SettingsPrinterTestInput {
  printerType: SettingsPrinterType;
  printerAddress: string;
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
  labelLanguage?: SettingsLabelLanguage;
}

interface SettingsTestPrinterPayload {
  input: SettingsPrinterTestInput;
}

interface SettingsExportDatabasePayload {
  destination: string;
}

interface SettingsRestoreDatabasePayload {
  source: string;
}

interface SettingsRpcPayloadByOperation {
  [SETTINGS_RPC_OPERATION.BOOTSTRAP]: SettingsEmptyPayload;
  [SETTINGS_RPC_OPERATION.UPDATE_REGIONAL]: SettingsUpdateRegionalPayload;
  [SETTINGS_RPC_OPERATION.UPDATE_COMANDA_HEADER]: SettingsUpdateComandaHeaderPayload;
  [SETTINGS_RPC_OPERATION.UPDATE_FEATURE_FLAG]: SettingsUpdateFeatureFlagPayload;
  [SETTINGS_RPC_OPERATION.LIST_PRINTERS]: SettingsEmptyPayload;
  [SETTINGS_RPC_OPERATION.CREATE_PRINTER]: SettingsCreatePrinterPayload;
  [SETTINGS_RPC_OPERATION.UPDATE_PRINTER]: SettingsUpdatePrinterPayload;
  [SETTINGS_RPC_OPERATION.ARCHIVE_PRINTER]: SettingsArchivePrinterPayload;
  [SETTINGS_RPC_OPERATION.TEST_PRINTER]: SettingsTestPrinterPayload;
  [SETTINGS_RPC_OPERATION.LIST_USB_PRINTERS]: SettingsEmptyPayload;
  [SETTINGS_RPC_OPERATION.GET_DATABASE_INFO]: SettingsEmptyPayload;
  [SETTINGS_RPC_OPERATION.EXPORT_DATABASE]: SettingsExportDatabasePayload;
  [SETTINGS_RPC_OPERATION.RESTORE_DATABASE]: SettingsRestoreDatabasePayload;
  [SETTINGS_RPC_OPERATION.CHECK_FOR_UPDATES]: SettingsEmptyPayload;
  [SETTINGS_RPC_OPERATION.DOWNLOAD_UPDATE]: SettingsEmptyPayload;
  [SETTINGS_RPC_OPERATION.RELAUNCH]: SettingsEmptyPayload;
}

interface SettingsRpcRequestFor<Operation extends SettingsRpcOperation> {
  id: string;
  operation: Operation;
  payload: SettingsRpcPayloadByOperation[Operation];
}

type SettingsRpcRequest = {
  [Operation in SettingsRpcOperation]: SettingsRpcRequestFor<Operation>;
}[SettingsRpcOperation];

interface SettingsPrinterDto {
  id: string;
  name: string;
  type: SettingsPrinterType;
  address: string;
  role: SettingsPrinterRole;
  isDefault: boolean;
  labelWidthMm: number;
  labelHeightMm: number;
  labelGapMm: number;
  labelLanguage: SettingsLabelLanguage;
  labelOrientation: SettingsPrinterOrientation;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface SettingsUsbPrinterDto {
  vid: number;
  pid: number;
  name: string;
  address: string;
}

interface SettingsDatabaseInfoDto {
  path: string;
  exists: boolean;
  sizeBytes: number | null;
}

interface SettingsUpdateIdleDto {
  kind: typeof SETTINGS_UPDATE_STATUS.IDLE;
}

interface SettingsUpdateCheckingDto {
  kind: typeof SETTINGS_UPDATE_STATUS.CHECKING;
}

interface SettingsUpdateAvailableDto {
  kind: typeof SETTINGS_UPDATE_STATUS.AVAILABLE;
  version: string;
  notes: string;
}

interface SettingsUpdateDownloadingProgressDto {
  downloaded: number;
  contentLength: number;
  percentage: number;
}

interface SettingsUpdateDownloadingDto {
  kind: typeof SETTINGS_UPDATE_STATUS.DOWNLOADING;
  progress: SettingsUpdateDownloadingProgressDto;
}

interface SettingsUpdateReadyToInstallDto {
  kind: typeof SETTINGS_UPDATE_STATUS.READY_TO_INSTALL;
  version: string;
}

interface SettingsUpdateErrorDto {
  kind: typeof SETTINGS_UPDATE_STATUS.ERROR;
  message: string;
}

type SettingsUpdateInfoDto =
  | SettingsUpdateIdleDto
  | SettingsUpdateCheckingDto
  | SettingsUpdateAvailableDto
  | SettingsUpdateDownloadingDto
  | SettingsUpdateReadyToInstallDto
  | SettingsUpdateErrorDto;

interface SettingsSnapshot {
  locale: string;
  currency: string;
  comandaHeaderText: string | null;
  flags: Record<string, boolean>;
  updater: SettingsUpdateInfoDto;
}

interface SettingsRpcDataByOperation {
  [SETTINGS_RPC_OPERATION.BOOTSTRAP]: SettingsSnapshot;
  [SETTINGS_RPC_OPERATION.UPDATE_REGIONAL]: SettingsSnapshot;
  [SETTINGS_RPC_OPERATION.UPDATE_COMANDA_HEADER]: SettingsSnapshot;
  [SETTINGS_RPC_OPERATION.UPDATE_FEATURE_FLAG]: SettingsSnapshot;
  [SETTINGS_RPC_OPERATION.LIST_PRINTERS]: SettingsPrinterDto[];
  [SETTINGS_RPC_OPERATION.CREATE_PRINTER]: SettingsPrinterDto;
  [SETTINGS_RPC_OPERATION.UPDATE_PRINTER]: SettingsPrinterDto;
  [SETTINGS_RPC_OPERATION.ARCHIVE_PRINTER]: null;
  [SETTINGS_RPC_OPERATION.TEST_PRINTER]: null;
  [SETTINGS_RPC_OPERATION.LIST_USB_PRINTERS]: SettingsUsbPrinterDto[];
  [SETTINGS_RPC_OPERATION.GET_DATABASE_INFO]: SettingsDatabaseInfoDto;
  [SETTINGS_RPC_OPERATION.EXPORT_DATABASE]: null;
  [SETTINGS_RPC_OPERATION.RESTORE_DATABASE]: null;
  [SETTINGS_RPC_OPERATION.CHECK_FOR_UPDATES]: SettingsUpdateInfoDto;
  [SETTINGS_RPC_OPERATION.DOWNLOAD_UPDATE]: SettingsUpdateInfoDto;
  [SETTINGS_RPC_OPERATION.RELAUNCH]: null;
}

type SettingsRpcData =
  SettingsRpcDataByOperation[SettingsRpcOperation];

interface SettingsRpcSuccessResponse {
  id: string;
  operation: SettingsRpcOperation;
  ok: true;
  data: SettingsRpcData;
}

interface SettingsRpcFailure {
  code: SettingsRpcErrorCode;
  message: string;
}

interface SettingsRpcFailureResponse {
  id: string;
  operation: string;
  ok: false;
  error: SettingsRpcFailure;
}

type SettingsRpcResponse = SettingsRpcSuccessResponse | SettingsRpcFailureResponse;

interface SettingsSettingsChange {
  kind: typeof SETTINGS_CHANGE_KIND.SETTINGS;
  value: SettingsSnapshot;
}

interface SettingsFlagsChange {
  kind: typeof SETTINGS_CHANGE_KIND.FLAGS;
  value: Record<string, boolean>;
}

interface SettingsUpdaterChange {
  kind: typeof SETTINGS_CHANGE_KIND.UPDATER;
  value: SettingsUpdateInfoDto;
}

interface SettingsPrintersInvalidatedChange {
  kind: typeof SETTINGS_CHANGE_KIND.PRINTERS_INVALIDATED;
}

type SettingsWindowChange =
  | SettingsSettingsChange
  | SettingsFlagsChange
  | SettingsUpdaterChange
  | SettingsPrintersInvalidatedChange;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || isBoolean(value);
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

function isOneOf<T extends Record<string, string>>(
  value: unknown,
  values: T,
): value is T[keyof T] {
  return isString(value) && Object.values(values).includes(value as T[keyof T]);
}

function isSettingsPrinterInput(value: unknown): value is SettingsPrinterInput {
  if (!isRecord(value)) return false;

  return (
    isString(value.name) &&
    isOneOf(value.type, SETTINGS_PRINTER_TYPE) &&
    isString(value.address) &&
    isOneOf(value.role, SETTINGS_PRINTER_ROLE) &&
    isOptionalBoolean(value.isDefault) &&
    isOptionalFiniteNumber(value.labelWidthMm) &&
    isOptionalFiniteNumber(value.labelHeightMm) &&
    isOptionalFiniteNumber(value.labelGapMm) &&
    (value.labelLanguage === undefined || isOneOf(value.labelLanguage, SETTINGS_LABEL_LANGUAGE)) &&
    (value.labelOrientation === undefined ||
      isOneOf(value.labelOrientation, SETTINGS_PRINTER_ORIENTATION))
  );
}

function isSettingsPrinterTestInput(value: unknown): value is SettingsPrinterTestInput {
  if (!isRecord(value)) return false;

  return (
    isOneOf(value.printerType, SETTINGS_PRINTER_TYPE) &&
    isString(value.printerAddress) &&
    isOptionalFiniteNumber(value.labelWidthMm) &&
    isOptionalFiniteNumber(value.labelHeightMm) &&
    isOptionalFiniteNumber(value.labelGapMm) &&
    (value.labelLanguage === undefined || isOneOf(value.labelLanguage, SETTINGS_LABEL_LANGUAGE))
  );
}

function isSettingsRpcPayload(
  operation: SettingsRpcOperation,
  payload: unknown,
): boolean {
  if (!isRecord(payload)) return false;

  switch (operation) {
    case SETTINGS_RPC_OPERATION.BOOTSTRAP:
    case SETTINGS_RPC_OPERATION.LIST_PRINTERS:
    case SETTINGS_RPC_OPERATION.LIST_USB_PRINTERS:
    case SETTINGS_RPC_OPERATION.GET_DATABASE_INFO:
    case SETTINGS_RPC_OPERATION.CHECK_FOR_UPDATES:
    case SETTINGS_RPC_OPERATION.DOWNLOAD_UPDATE:
    case SETTINGS_RPC_OPERATION.RELAUNCH:
      return true;
    case SETTINGS_RPC_OPERATION.UPDATE_REGIONAL:
      return isString(payload.locale) && isString(payload.currency);
    case SETTINGS_RPC_OPERATION.UPDATE_COMANDA_HEADER:
      return payload.text === null || isString(payload.text);
    case SETTINGS_RPC_OPERATION.UPDATE_FEATURE_FLAG:
      return isNonEmptyString(payload.key) && isBoolean(payload.value);
    case SETTINGS_RPC_OPERATION.CREATE_PRINTER:
      return isSettingsPrinterInput(payload.input);
    case SETTINGS_RPC_OPERATION.UPDATE_PRINTER:
      return isNonEmptyString(payload.id) && isSettingsPrinterInput(payload.input);
    case SETTINGS_RPC_OPERATION.ARCHIVE_PRINTER:
      return isNonEmptyString(payload.id);
    case SETTINGS_RPC_OPERATION.TEST_PRINTER:
      return isSettingsPrinterTestInput(payload.input);
    case SETTINGS_RPC_OPERATION.EXPORT_DATABASE:
      return isNonEmptyString(payload.destination);
    case SETTINGS_RPC_OPERATION.RESTORE_DATABASE:
      return isNonEmptyString(payload.source);
  }
}

function isSettingsRpcOperation(value: unknown): value is SettingsRpcOperation {
  return isOneOf(value, SETTINGS_RPC_OPERATION);
}

interface SettingsRpcRequestReference {
  id: string;
  operation: string;
}

function getSettingsRpcRequestReference(value: unknown): SettingsRpcRequestReference | null {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isString(value.operation)) {
    return null;
  }

  return { id: value.id, operation: value.operation };
}

function isSettingsRpcRequest(value: unknown): value is SettingsRpcRequest {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.id) &&
    isSettingsRpcOperation(value.operation) &&
    isSettingsRpcPayload(value.operation, value.payload)
  );
}

function isSettingsRpcResponse(value: unknown): value is SettingsRpcResponse {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return false;
  if (value.ok === true) {
    return isSettingsRpcOperation(value.operation) && "data" in value;
  }

  return (
    value.ok === false &&
    isString(value.operation) &&
    isRecord(value.error) &&
    isOneOf(value.error.code, SETTINGS_RPC_ERROR_CODE) &&
    isString(value.error.message)
  );
}

function isSettingsWindowChange(value: unknown): value is SettingsWindowChange {
  if (!isRecord(value) || !isOneOf(value.kind, SETTINGS_CHANGE_KIND)) return false;

  switch (value.kind) {
    case SETTINGS_CHANGE_KIND.SETTINGS:
    case SETTINGS_CHANGE_KIND.FLAGS:
    case SETTINGS_CHANGE_KIND.UPDATER:
      return "value" in value;
    case SETTINGS_CHANGE_KIND.PRINTERS_INVALIDATED:
      return true;
  }
}

export {
  getSettingsRpcRequestReference,
  isSettingsRpcOperation,
  isSettingsRpcRequest,
  isSettingsRpcResponse,
  isSettingsWindowChange,
  SETTINGS_CHANGE_KIND,
  SETTINGS_LABEL_LANGUAGE,
  SETTINGS_MAIN_WINDOW,
  SETTINGS_PRINTER_ORIENTATION,
  SETTINGS_PRINTER_ROLE,
  SETTINGS_PRINTER_TYPE,
  SETTINGS_RPC_ERROR_CODE,
  SETTINGS_RPC_EVENT,
  SETTINGS_RPC_OPERATION,
  SETTINGS_RPC_TIMEOUT_MS,
  SETTINGS_UPDATE_STATUS,
  SETTINGS_WINDOW,
};
export type {
  SettingsArchivePrinterPayload,
  SettingsChangeKind,
  SettingsCreatePrinterPayload,
  SettingsDatabaseInfoDto,
  SettingsEmptyPayload,
  SettingsExportDatabasePayload,
  SettingsLabelLanguage,
  SettingsPrinterDto,
  SettingsPrinterInput,
  SettingsPrinterOrientation,
  SettingsPrinterRole,
  SettingsPrinterTestInput,
  SettingsPrinterType,
  SettingsRestoreDatabasePayload,
  SettingsRpcData,
  SettingsRpcDataByOperation,
  SettingsRpcErrorCode,
  SettingsRpcFailure,
  SettingsRpcOperation,
  SettingsRpcPayloadByOperation,
  SettingsRpcRequest,
  SettingsRpcRequestFor,
  SettingsRpcRequestReference,
  SettingsRpcResponse,
  SettingsSnapshot,
  SettingsTestPrinterPayload,
  SettingsUpdateComandaHeaderPayload,
  SettingsUpdateFeatureFlagPayload,
  SettingsUpdateInfoDto,
  SettingsUpdateRegionalPayload,
  SettingsUpdateStatus,
  SettingsUpdatePrinterPayload,
  SettingsUsbPrinterDto,
  SettingsWindowChange,
};
