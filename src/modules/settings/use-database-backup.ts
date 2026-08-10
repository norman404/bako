import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { DatabaseBackupService, DatabaseInfo } from "./ports";
import { tauriDatabaseBackupService } from "./tauri-database-backup.adapter";
import { performDatabaseExport, performDatabaseRestore } from "./database-backup";

const DATABASE_INFO_QUERY_KEY = ["settings", "database-info"] as const;

const DATABASE_OPERATION = {
  EXPORT: "export",
  RESTORE: "restore",
} as const;

type DatabaseOperation = (typeof DATABASE_OPERATION)[keyof typeof DATABASE_OPERATION] | null;

interface UseDatabaseBackupResult {
  info: DatabaseInfo | undefined;
  isInfoLoading: boolean;
  isBusy: boolean;
  requestExport(): Promise<boolean>;
  requestRestore(source: string): Promise<boolean>;
}

export function useDatabaseBackup(
  service: DatabaseBackupService = tauriDatabaseBackupService,
): UseDatabaseBackupResult {
  const [operation, setOperation] = useState<DatabaseOperation>(null);
  const infoQuery = useQuery({
    queryKey: DATABASE_INFO_QUERY_KEY,
    queryFn: service.getDatabaseInfo,
  });

  async function requestExport(): Promise<boolean> {
    if (operation) return false;

    setOperation(DATABASE_OPERATION.EXPORT);
    try {
      const destination = await service.chooseExportDestination();
      if (!destination) return false;

      await performDatabaseExport(service, destination);
      return true;
    } finally {
      setOperation(null);
    }
  }

  async function requestRestore(source: string): Promise<boolean> {
    if (operation) return false;

    setOperation(DATABASE_OPERATION.RESTORE);
    try {
      return await performDatabaseRestore(service, source);
    } finally {
      setOperation(null);
    }
  }

  return {
    info: infoQuery.data,
    isInfoLoading: infoQuery.isLoading,
    isBusy: operation !== null,
    requestExport,
    requestRestore,
  };
}

export { DATABASE_INFO_QUERY_KEY, DATABASE_OPERATION };
