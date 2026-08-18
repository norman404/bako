import { useQuery } from "@tanstack/react-query";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

import {
  SETTINGS_RPC_OPERATION,
  type SettingsDatabaseInfoDto,
} from "./settings-window-protocol";
import { requestSettingsOperation } from "./settings-window-client";

const DATABASE_FILTERS = [
  { name: "SQLite", extensions: ["sqlite", "db"] },
];

const SETTINGS_WINDOW_DATABASE_QUERY_KEY = ["settings-window", "database-info"] as const;

const DATABASE_OPERATION = {
  EXPORT: "export",
  RESTORE: "restore",
} as const;

type DatabaseOperation =
  (typeof DATABASE_OPERATION)[keyof typeof DATABASE_OPERATION] | null;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function createBackupFilename(date: Date): string {
  const datePart = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("");
  const timePart = [pad(date.getHours()), pad(date.getMinutes())].join("");
  return `bako-backup-${datePart}-${timePart}.sqlite`;
}

interface SettingsWindowDatabaseBackupResult {
  info: SettingsDatabaseInfoDto | undefined;
  isInfoLoading: boolean;
  isBusy: boolean;
  chooseRestoreSource: () => Promise<string | null>;
  requestExport: () => Promise<boolean>;
  requestRestore: (source: string) => Promise<boolean>;
}

export function useSettingsWindowDatabaseBackup(): SettingsWindowDatabaseBackupResult {
  const [operation, setOperation] = useState<DatabaseOperation>(null);
  const infoQuery = useQuery({
    queryKey: SETTINGS_WINDOW_DATABASE_QUERY_KEY,
    queryFn: () => requestSettingsOperation(SETTINGS_RPC_OPERATION.GET_DATABASE_INFO, {}),
  });

  async function chooseRestoreSource(): Promise<string | null> {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: DATABASE_FILTERS,
    });

    return typeof selected === "string" ? selected : null;
  }

  async function requestExport(): Promise<boolean> {
    if (operation) return false;

    setOperation(DATABASE_OPERATION.EXPORT);
    try {
      const destination = await save({
        defaultPath: createBackupFilename(new Date()),
        filters: DATABASE_FILTERS,
      });
      if (!destination) return false;

      await requestSettingsOperation(SETTINGS_RPC_OPERATION.EXPORT_DATABASE, { destination });
      return true;
    } finally {
      setOperation(null);
    }
  }

  async function requestRestore(source: string): Promise<boolean> {
    if (operation) return false;

    setOperation(DATABASE_OPERATION.RESTORE);
    try {
      await requestSettingsOperation(SETTINGS_RPC_OPERATION.RESTORE_DATABASE, { source });
      return true;
    } finally {
      setOperation(null);
    }
  }

  return {
    info: infoQuery.data,
    isInfoLoading: infoQuery.isLoading,
    isBusy: operation !== null,
    chooseRestoreSource,
    requestExport,
    requestRestore,
  };
}

export { SETTINGS_WINDOW_DATABASE_QUERY_KEY };
