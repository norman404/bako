import { performDatabaseExport, performDatabaseRestore } from "./database-backup";
import type { DatabaseInfo } from "./ports";
import { tauriDatabaseBackupService } from "./tauri-database-backup.adapter";

async function getDatabaseInfo(): Promise<DatabaseInfo> {
  return tauriDatabaseBackupService.getDatabaseInfo();
}

async function exportDatabase(destination: string): Promise<void> {
  await performDatabaseExport(tauriDatabaseBackupService, destination);
}

async function restoreDatabase(source: string): Promise<boolean> {
  return performDatabaseRestore(tauriDatabaseBackupService, source);
}

export { exportDatabase, getDatabaseInfo, restoreDatabase };
